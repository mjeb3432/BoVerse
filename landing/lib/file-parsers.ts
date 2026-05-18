// File parsers. Take a Buffer + MIME type, return extracted text (or null for
// binary/image types that go straight to the multimodal LLM as inline data).
//
// Design notes:
//   - We detect by EXTENSION first, MIME second. Browsers report inconsistent
//     MIME types (e.g. .jpg may come as application/octet-stream from drag-
//     and-drop on some platforms). Extension is more reliable for the file
//     types this app cares about.
//   - JSON is PARSED, not passed raw. Array-of-objects → markdown table.
//     Single object → pretty-printed JSON. This makes the LLM's structure
//     extraction job ~5x more reliable on the live test runs we did.
//   - PDFs that come back with <50 chars of text (scanned PDFs / images-as-
//     PDF) are marked `isImage: true` so the Stage 01 route routes them
//     to the multimodal Gemini path instead of the text path. The fallback
//     used to silently send empty strings to the LLM and confuse it.

import { simpleParser } from 'mailparser';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ParsedFile = {
  text: string | null;          // null = binary file, send inline to LLM
  isImage: boolean;
  isBinary: boolean;
  meta: Record<string, unknown>;
};

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tiff']);

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedFile> {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  const isImageExt = IMAGE_EXTS.has(ext);
  const isImageMime = mimeType.startsWith('image/');

  // ─── Images: pass through. Multimodal LLM reads them inline. ──────────
  // Detect by EITHER ext or MIME (browsers report inconsistent MIME types
  // for drag-and-dropped images, especially .jpg).
  if (isImageMime || isImageExt) {
    return {
      text: null,
      isImage: true,
      isBinary: true,
      meta: { mimeType: isImageMime ? mimeType : `image/${ext === 'jpg' ? 'jpeg' : ext}`, fileName },
    };
  }

  // ─── PDF: extract text. Fall through to multimodal if extraction empty. ─
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const pdf = await import('pdf-parse');
      type PdfFn = (input: Buffer | Uint8Array) => Promise<{ text: string; numpages: number; info?: unknown }>;
      const pdfParse = ((pdf as unknown as { default?: PdfFn }).default
        ?? (pdf as unknown as { pdf?: PdfFn }).pdf
        ?? (pdf as unknown as PdfFn)) as PdfFn;
      const result = await pdfParse(buffer);
      const text = (result.text ?? '').trim();

      // If we got <50 chars of usable text, this is a scanned PDF or one
      // with embedded images. Route to multimodal instead of sending an
      // empty string to the LLM. Gemini's multimodal path reads PDFs
      // natively, including scanned ones.
      if (text.length < 50) {
        return {
          text: null,
          isImage: true, // Treat as multimodal-routable
          isBinary: true,
          meta: {
            mimeType: 'application/pdf',
            fileName,
            pages: result.numpages,
            note: 'PDF text extraction returned <50 chars — routing to multimodal model.',
          },
        };
      }

      return {
        text,
        isImage: false,
        isBinary: false,
        meta: { pages: result.numpages, info: result.info, fileName },
      };
    } catch (err) {
      // pdf-parse threw — likely a corrupted or encrypted PDF. Fall through
      // to multimodal so the LLM can at least try to see it.
      return {
        text: null,
        isImage: true,
        isBinary: true,
        meta: {
          mimeType: 'application/pdf',
          fileName,
          note: `pdf-parse failed: ${(err as Error).message}. Routing to multimodal model.`,
        },
      };
    }
  }

  // ─── Email (.eml). ─────────────────────────────────────────────────────
  if (mimeType === 'message/rfc822' || ext === 'eml') {
    const parsed = await simpleParser(buffer);
    const body = [
      parsed.subject ? `Subject: ${parsed.subject}` : '',
      parsed.from?.text ? `From: ${parsed.from.text}` : '',
      parsed.to ? `To: ${Array.isArray(parsed.to) ? parsed.to.map((a) => a.text).join(', ') : parsed.to.text}` : '',
      parsed.date ? `Date: ${parsed.date.toISOString()}` : '',
      '',
      parsed.text ?? parsed.html ?? '',
    ]
      .filter(Boolean)
      .join('\n');
    return {
      text: body,
      isImage: false,
      isBinary: false,
      meta: { subject: parsed.subject, from: parsed.from?.text, to: parsed.to, fileName },
    };
  }

  // ─── CSV. ──────────────────────────────────────────────────────────────
  if (mimeType === 'text/csv' || ext === 'csv') {
    const text = buffer.toString('utf-8');
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return {
      text: tabularToMarkdown(parsed.data as Record<string, unknown>[], parsed.meta.fields ?? []),
      isImage: false,
      isBinary: false,
      meta: { rowCount: parsed.data.length, fields: parsed.meta.fields, fileName },
    };
  }

  // ─── XLSX/XLS. ─────────────────────────────────────────────────────────
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.ms-excel' ||
    ext === 'xlsx' ||
    ext === 'xls'
  ) {
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const sheets = wb.SheetNames.map((name) => {
      const sheet = wb.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
      const fields = rows.length > 0 ? Object.keys(rows[0]) : [];
      return `### Sheet: ${name}\n\n${tabularToMarkdown(rows, fields)}`;
    });
    return {
      text: sheets.join('\n\n'),
      isImage: false,
      isBinary: false,
      meta: { sheetCount: wb.SheetNames.length, sheets: wb.SheetNames, fileName },
    };
  }

  // ─── JSON. Parse + format. Array-of-objects → markdown table. ─────────
  if (mimeType === 'application/json' || ext === 'json') {
    const raw = buffer.toString('utf-8');
    try {
      const parsed = JSON.parse(raw);
      return {
        text: jsonToReadable(parsed),
        isImage: false,
        isBinary: false,
        meta: {
          mimeType: 'application/json',
          fileName,
          kind: Array.isArray(parsed) ? 'array' : typeof parsed,
          length: Array.isArray(parsed) ? parsed.length : undefined,
        },
      };
    } catch (err) {
      // Malformed JSON — treat as plain text rather than failing the whole
      // ingest. The LLM can still parse pseudo-JSON.
      return {
        text: `[JSON parse failed: ${(err as Error).message}]\n\n${raw}`,
        isImage: false,
        isBinary: false,
        meta: { mimeType: 'application/json', fileName, note: 'parse_failed' },
      };
    }
  }

  // ─── Plain text fallback. ──────────────────────────────────────────────
  if (mimeType.startsWith('text/') || ['txt', 'md', 'markdown', 'log'].includes(ext)) {
    return {
      text: buffer.toString('utf-8'),
      isImage: false,
      isBinary: false,
      meta: { mimeType, fileName },
    };
  }

  // ─── Unknown binary. ───────────────────────────────────────────────────
  return {
    text: null,
    isImage: false,
    isBinary: true,
    meta: { mimeType, fileName, note: 'Unrecognized binary file; passed through.' },
  };
}

// Render any tabular payload (CSV rows, XLSX rows) as a markdown table. The
// LLM reads markdown tables much more reliably than pipe-delimited prose,
// and the structure survives token-truncation better. We cap at 50 rows so
// large files don't blow the prompt budget — the LLM only needs a sample to
// infer the schema.
function tabularToMarkdown(rows: Record<string, unknown>[], fields: string[]): string {
  if (rows.length === 0) return '(empty sheet)';
  const headers = fields.length > 0 ? fields : Object.keys(rows[0]);
  const sample = rows.slice(0, 50);
  const lines: string[] = [];
  lines.push(`*${rows.length} row${rows.length === 1 ? '' : 's'} total${rows.length > 50 ? ` — showing first 50` : ''}.*`);
  lines.push('');
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const row of sample) {
    const cells = headers.map((h) => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v);
      // Escape pipes that would break the table.
      return String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
    });
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

// Pretty-print a parsed JSON value for the LLM. Top-level array-of-objects
// becomes a markdown table (much easier to reason over than raw JSON);
// everything else gets pretty-printed JSON in a fenced block.
function jsonToReadable(parsed: unknown): string {
  // Array-of-objects → markdown table.
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
    const rows = parsed as Record<string, unknown>[];
    const fields = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    return tabularToMarkdown(rows, fields);
  }
  // Anything else: pretty JSON in a fenced block. Limit to 50K chars so we
  // don't burn the prompt budget on giant JSON dumps.
  const json = JSON.stringify(parsed, null, 2);
  const truncated = json.length > 50_000 ? json.slice(0, 50_000) + '\n... [truncated]' : json;
  return `\`\`\`json\n${truncated}\n\`\`\``;
}

export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'message/rfc822',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/plain',
  'text/markdown',
  'application/json',
];

export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.eml',
  '.csv',
  '.xlsx',
  '.xls',
  '.txt',
  '.md',
  '.json',
];
