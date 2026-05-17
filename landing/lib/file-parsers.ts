// File parsers. Take a Buffer + MIME type, return extracted text (or null for
// binary types like images that go straight to the LLM as inline data).

import { simpleParser } from 'mailparser';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type ParsedFile = {
  text: string | null;          // null = binary file, send inline to LLM
  isImage: boolean;
  isBinary: boolean;
  meta: Record<string, unknown>;
};

export async function parseFile(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<ParsedFile> {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';

  // ─── Images: pass through. Gemini reads them natively. ────────────────
  if (mimeType.startsWith('image/')) {
    return { text: null, isImage: true, isBinary: true, meta: { mimeType } };
  }

  // ─── PDF: extract text via pdf-parse (lazy import to avoid eager load). ─
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    // pdf-parse v2+ ships ESM with named exports.
    const pdf = await import('pdf-parse');
    // v2 exports `pdf` (default) and types it as ImportPdfParseFunction.
    type PdfFn = (input: Buffer | Uint8Array) => Promise<{ text: string; numpages: number; info?: unknown }>;
    const pdfParse = ((pdf as unknown as { default?: PdfFn }).default
      ?? (pdf as unknown as { pdf?: PdfFn }).pdf
      ?? (pdf as unknown as PdfFn)) as PdfFn;
    const result = await pdfParse(buffer);
    return {
      text: result.text,
      isImage: false,
      isBinary: false,
      meta: { pages: result.numpages, info: result.info },
    };
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
      meta: { subject: parsed.subject, from: parsed.from?.text, to: parsed.to },
    };
  }

  // ─── CSV. ──────────────────────────────────────────────────────────────
  if (mimeType === 'text/csv' || ext === 'csv') {
    const text = buffer.toString('utf-8');
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    return {
      text: csvToReadable(parsed.data as Record<string, unknown>[]),
      isImage: false,
      isBinary: false,
      meta: { rowCount: parsed.data.length, fields: parsed.meta.fields },
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
      return `### Sheet: ${name}\n${csvToReadable(rows)}`;
    });
    return {
      text: sheets.join('\n\n'),
      isImage: false,
      isBinary: false,
      meta: { sheetCount: wb.SheetNames.length, sheets: wb.SheetNames },
    };
  }

  // ─── Plain text fallback. ──────────────────────────────────────────────
  if (mimeType.startsWith('text/') || ['txt', 'md', 'json'].includes(ext)) {
    return {
      text: buffer.toString('utf-8'),
      isImage: false,
      isBinary: false,
      meta: { mimeType },
    };
  }

  // ─── Unknown binary. ───────────────────────────────────────────────────
  return {
    text: null,
    isImage: false,
    isBinary: true,
    meta: { mimeType, note: 'Unrecognized binary file; passed through.' },
  };
}

function csvToReadable(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '(empty sheet)';
  const headers = Object.keys(rows[0]);
  const sample = rows.slice(0, 50);
  return [
    `${rows.length} rows. First ${sample.length} shown.`,
    '',
    headers.join(' | '),
    headers.map(() => '---').join(' | '),
    ...sample.map((r) => headers.map((h) => String(r[h] ?? '')).join(' | ')),
  ].join('\n');
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
