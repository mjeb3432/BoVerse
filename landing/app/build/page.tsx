'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site/site-header';
import SiteFooter from '@/components/site/site-footer';
import type {
  ClarifyAnswers,
  ClarifyOutput,
  DeliverOutput,
  GenerateOutput,
  IngestOutput,
  SessionStage,
  SimulateOutput,
} from '@/lib/workflow-types';
import { ACCEPTED_EXTENSIONS } from '@/lib/file-parsers';

// ────────────────────────────────────────────────────────────────────────────
// Local session state. Backed by sessionStorage so a refresh keeps progress
// in this tab. Postgres persistence happens in parallel via the API routes
// once Supabase keys are set.
// ────────────────────────────────────────────────────────────────────────────

type LocalState = {
  session_id: string | null;
  stage: SessionStage;
  uploaded_files: { name: string; size: number; type: string }[];
  ingest_output?: IngestOutput;
  clarify_output?: ClarifyOutput;
  clarify_answers?: ClarifyAnswers;
  simulate_output?: SimulateOutput;
  generate_output?: GenerateOutput;
  deliver_output?: DeliverOutput;
  exec_events: ExecEvent[];
};

type ExecEvent =
  | { type: 'spec'; workflow_spec_markdown: string }
  | { type: 'row_started'; row_id: string; kind: 'happy' | 'edge' }
  | { type: 'step_started'; row_id: string; step_id: string; step_name: string; index: number; total: number }
  | { type: 'step_finished'; row_id: string; step_id: string; status: string; duration_ms: number; output?: unknown; trace_message?: string; error?: string }
  | { type: 'row_finished'; row_id: string; status: string }
  | { type: 'done'; summary: DeliverOutput['execution_summary'] };

const SS_KEY = 'boverse-build-state-v1';

const stages: { id: SessionStage; n: string; label: string; desc: string }[] = [
  { id: 'ingest', n: '01', label: 'INGEST', desc: 'Drop artifacts. AI extracts structure.' },
  { id: 'clarify', n: '02', label: 'CLARIFY', desc: 'Up to 5 targeted gap questions.' },
  { id: 'simulate', n: '03', label: 'SIMULATE', desc: 'Schema + 10 synthetic rows.' },
  { id: 'generate', n: '04', label: 'GENERATE', desc: 'Full workflow definition.' },
  { id: 'deliver', n: '05', label: 'DELIVER', desc: 'Spec + per-row execution.' },
];

const stageIndex = (s: SessionStage) => stages.findIndex((x) => x.id === s);

// Vercel's serverless ceiling on Hobby is 60s. When a function exceeds it,
// Vercel returns an HTML error page that begins with "An error occurred…".
// The default `await r.json()` then throws the unhelpful
// "Unexpected token 'A', \"An error o\". is not valid JSON". This helper
// inspects Content-Type first so the user sees actionable text.
async function safeJson(
  r: Response,
  stageLabel: string
): Promise<{ ok: true; data: unknown } | { ok: false; message: string }> {
  const ct = r.headers.get('content-type') ?? '';
  if (!ct.includes('json')) {
    const body = await r.text().catch(() => '');
    const snippet = body.slice(0, 160).trim();
    if (r.status === 504 || r.status === 408 || /timed? ?out/i.test(snippet)) {
      return {
        ok: false,
        message: `${stageLabel} exceeded the 60s function ceiling on Vercel. The model was probably overloaded — try again, often the second pass goes through. (HTTP ${r.status})`,
      };
    }
    if (r.status >= 500) {
      return {
        ok: false,
        message: `${stageLabel} crashed on the server (HTTP ${r.status}). ${snippet ? `Server said: ${snippet.slice(0, 100)}` : 'Try again or RESET to start over.'}`,
      };
    }
    return {
      ok: false,
      message: `${stageLabel} returned an unexpected response (HTTP ${r.status}, ${ct || 'no content-type'}).`,
    };
  }
  try {
    return { ok: true, data: await r.json() };
  } catch {
    return {
      ok: false,
      message: `${stageLabel} returned malformed JSON. Try again or RESET.`,
    };
  }
}

export default function BuildPage() {
  const [state, setState] = useState<LocalState>({
    session_id: null,
    stage: 'idle',
    uploaded_files: [],
    exec_events: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<SessionStage | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      try {
        setState(JSON.parse(raw) as LocalState);
      } catch {}
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current || typeof window === 'undefined') return;
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  }, [state]);

  // Recovery guard: if state is inconsistent (e.g. stage advanced past a
  // failed API call so the prerequisite output is missing), roll back to the
  // last stage we have inputs for. Without this, users land on an empty page
  // with no actionable affordance.
  useEffect(() => {
    if (!hydrated.current) return;
    if (state.stage === 'clarify' && !state.ingest_output) {
      setState((s) => ({ ...s, stage: 'ingest' }));
    } else if (state.stage === 'simulate' && !state.clarify_output) {
      setState((s) => ({ ...s, stage: 'clarify' }));
    } else if (state.stage === 'generate' && !state.simulate_output) {
      setState((s) => ({ ...s, stage: 'simulate' }));
    } else if (state.stage === 'deliver' && !state.generate_output) {
      setState((s) => ({ ...s, stage: 'generate' }));
    }
  }, [state.stage, state.ingest_output, state.clarify_output, state.simulate_output, state.generate_output]);

  const resetSession = async () => {
    sessionStorage.removeItem(SS_KEY);
    setState({ session_id: null, stage: 'idle', uploaded_files: [], exec_events: [] });
    setError(null);
  };

  const startSession = async (): Promise<string> => {
    if (state.session_id) return state.session_id;
    const r = await fetch('/api/build/session', { method: 'POST' });
    const parsed = await safeJson(r, 'Session');
    if (!parsed.ok) throw new Error(parsed.message);
    const data = parsed.data as { id: string };
    setState((s) => ({ ...s, session_id: data.id, stage: 'ingest' }));
    return data.id;
  };

  const runIngest = async (files: File[]) => {
    setBusy('ingest');
    setError(null);
    try {
      const sid = await startSession();
      const fd = new FormData();
      fd.append('session_id', sid);
      for (const f of files) fd.append('files', f);
      const r = await fetch('/api/build/01-ingest', { method: 'POST', body: fd });
      const parsed = await safeJson(r, 'Stage 01 (INGEST)');
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const data = parsed.data as { error?: string; message?: string; output?: IngestOutput; mock?: IngestOutput };
      if (data.error === 'llm_not_configured') {
        setError(data.message ?? 'LLM not configured');
        setState((s) => ({
          ...s,
          stage: 'clarify',
          uploaded_files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          ingest_output: data.mock,
        }));
      } else if (data.error) {
        setError(data.message || data.error);
      } else {
        setState((s) => ({
          ...s,
          stage: 'clarify',
          uploaded_files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
          ingest_output: data.output,
        }));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runClarify = async () => {
    if (!state.ingest_output || !state.session_id) return;
    setBusy('clarify');
    setError(null);
    try {
      const r = await fetch('/api/build/02-clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: state.session_id, ingest_output: state.ingest_output }),
      });
      const parsed = await safeJson(r, 'Stage 02 (CLARIFY)');
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const data = parsed.data as { error?: string; message?: string; output?: ClarifyOutput };
      if (data.error || !data.output) {
        setError(data.message ?? data.error ?? 'Clarify failed: no output returned.');
        return;
      }
      setState((s) => ({ ...s, clarify_output: data.output }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const submitAnswers = async (answers: ClarifyAnswers) => {
    if (!state.session_id) return;
    await fetch('/api/build/02-clarify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: state.session_id, answers: answers.answers }),
    });
    setState((s) => ({ ...s, clarify_answers: answers, stage: 'simulate' }));
  };

  const runSimulate = async () => {
    if (!state.session_id || !state.ingest_output || !state.clarify_output || !state.clarify_answers) return;
    setBusy('simulate');
    setError(null);
    try {
      const r = await fetch('/api/build/03-simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.session_id,
          ingest_output: state.ingest_output,
          clarify_output: state.clarify_output,
          clarify_answers: state.clarify_answers,
        }),
      });
      const parsed = await safeJson(r, 'Stage 03 (SIMULATE)');
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const data = parsed.data as { error?: string; message?: string; output?: SimulateOutput };
      if (data.error || !data.output) {
        // CRITICAL: do NOT advance stage on error — otherwise StageGenerate
        // renders nothing (its render gate is `simulate_output && ...`) and
        // the user lands on an empty page with no way forward.
        setError(data.message ?? data.error ?? 'Simulate failed: no output returned.');
        return;
      }
      setState((s) => ({ ...s, simulate_output: data.output, stage: 'generate' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runGenerate = async () => {
    if (!state.session_id || !state.ingest_output || !state.clarify_answers || !state.simulate_output) return;
    setBusy('generate');
    setError(null);
    try {
      const r = await fetch('/api/build/04-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.session_id,
          ingest_output: state.ingest_output,
          clarify_answers: state.clarify_answers,
          simulate_output: state.simulate_output,
        }),
      });
      const parsed = await safeJson(r, 'Stage 04 (GENERATE)');
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      const data = parsed.data as { error?: string; message?: string; output?: GenerateOutput };
      if (data.error || !data.output) {
        setError(data.message ?? data.error ?? 'Generate failed: no output returned.');
        return;
      }
      setState((s) => ({ ...s, generate_output: data.output, stage: 'deliver' }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const runDeliver = async () => {
    if (!state.session_id || !state.generate_output || !state.simulate_output) return;
    setBusy('deliver');
    setError(null);
    setState((s) => ({ ...s, exec_events: [], deliver_output: undefined }));

    try {
      const r = await fetch('/api/build/05-deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.session_id,
          generate_output: state.generate_output,
          simulate_output: state.simulate_output,
        }),
      });
      if (!r.body) throw new Error('No response body');
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const evLine = part.split('\n').find((l) => l.startsWith('event: '));
          const dataLine = part.split('\n').find((l) => l.startsWith('data: '));
          if (!evLine || !dataLine) continue;
          const evType = evLine.slice('event: '.length).trim();
          const evData = JSON.parse(dataLine.slice('data: '.length));
          setState((s) => ({ ...s, exec_events: [...s.exec_events, { type: evType, ...evData } as ExecEvent] }));
          if (evType === 'done') setState((s) => ({ ...s, stage: 'complete' }));
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const downloadSpec = () => {
    const specEvent = state.exec_events.find((e): e is Extract<ExecEvent, { type: 'spec' }> => e.type === 'spec');
    if (!specEvent) return;
    const blob = new Blob([specEvent.workflow_spec_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(state.generate_output?.workflow_name ?? 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadDocx = async () => {
    if (!state.generate_output || !state.simulate_output) return;
    const summary = state.exec_events.find(
      (e): e is Extract<ExecEvent, { type: 'done' }> => e.type === 'done'
    )?.summary;
    try {
      const r = await fetch('/api/build/05-deliver/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generate_output: state.generate_output,
          simulate_output: state.simulate_output,
          execution_summary: summary ?? null,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ message: r.statusText }));
        setError(err.message ?? `Word doc download failed: ${r.status}`);
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(state.generate_output.workflow_name ?? 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const currentIdx = state.stage === 'idle' ? -1 : stageIndex(state.stage);

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <main id="main" className="relative">
        <section className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
          <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>

          <div className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-6xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">BUILD WORKFLOW · LIVE</span>
              <div className="flex-1 h-px bg-white"></div>
              {state.session_id && (
                <button
                  onClick={resetSession}
                  className="text-[10px] font-mono text-white/40 hover:text-white tracking-widest border border-white/20 px-2 py-1 hover:border-white/60 transition-colors"
                >
                  RESET
                </button>
              )}
            </div>

            <h1 className="text-3xl lg:text-6xl font-bold font-mono tracking-wider leading-[1.05] mb-6" style={{ letterSpacing: '0.06em' }}>
              DROP YOUR ARTIFACTS.
              <span className="block opacity-80 mt-1 lg:mt-2">GET A WORKFLOW.</span>
            </h1>

            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed max-w-3xl">
              Upload a quote PDF, an email thread, a labour rate spreadsheet — anything your business already produces. The factory reads them, reasons backwards to the embedded process, asks at most 5 clarifying questions, and emits a runnable workflow plus a real per-row execution trace.
            </p>
          </div>
        </section>

        <section className="border-b border-white/10 bg-white/[0.02]">
          <div className="container mx-auto px-6 lg:px-16 py-4 lg:py-6 max-w-6xl">
            <ol className="grid grid-cols-5 gap-1 lg:gap-3 font-mono">
              {stages.map((s, i) => {
                const reached = currentIdx >= i || state.stage === 'complete';
                const active = state.stage === s.id && busy === s.id;
                return (
                  <li key={s.id} className="flex flex-col">
                    <div className={`h-1 mb-2 transition-colors ${reached ? 'bg-white' : 'bg-white/10'} ${active ? 'animate-pulse' : ''}`}></div>
                    <div className={`text-[9px] lg:text-[10px] tracking-widest ${reached ? 'text-white' : 'text-white/30'}`}>
                      {s.n} · {s.label}
                    </div>
                    <div className="hidden lg:block text-[10px] text-white/40 mt-1">{s.desc}</div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {error && (
          <div className="container mx-auto px-6 lg:px-16 py-4 max-w-6xl">
            <div className="border border-yellow-400/40 bg-yellow-400/5 px-4 py-3 font-mono text-xs text-yellow-200">
              <div className="text-[10px] tracking-widest text-yellow-400 mb-1">NOTE</div>
              {error}
            </div>
          </div>
        )}

        <section className="container mx-auto px-6 lg:px-16 py-12 lg:py-16 max-w-6xl">
          {(state.stage === 'idle' || state.stage === 'ingest') && (
            <StageIngest busy={busy === 'ingest'} onSubmit={runIngest} existing={state.ingest_output} uploaded={state.uploaded_files} />
          )}
          {state.stage === 'clarify' && state.ingest_output && (
            <StageClarify
              ingest={state.ingest_output}
              clarify={state.clarify_output}
              answers={state.clarify_answers}
              busy={busy === 'clarify'}
              onGenerate={runClarify}
              onSubmit={submitAnswers}
            />
          )}
          {state.stage === 'simulate' && state.clarify_output && (
            <StageSimulate simulate={state.simulate_output} busy={busy === 'simulate'} onGenerate={runSimulate} />
          )}
          {state.stage === 'generate' && state.simulate_output && (
            <StageGenerate generate={state.generate_output} busy={busy === 'generate'} onGenerate={runGenerate} />
          )}
          {(state.stage === 'deliver' || state.stage === 'complete') && state.generate_output && (
            <StageDeliver
              workflow={state.generate_output}
              events={state.exec_events}
              busy={busy === 'deliver'}
              onRun={runDeliver}
              onDownloadSpec={downloadSpec}
              onDownloadDocx={downloadDocx}
            />
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// ─── Stage 01 — INGEST ────────────────────────────────────────────────────

function StageIngest({
  busy,
  onSubmit,
  existing,
  uploaded,
}: {
  busy: boolean;
  onSubmit: (files: File[]) => void;
  existing?: IngestOutput;
  uploaded: { name: string; size: number; type: string }[];
}) {
  const [files, setFiles] = useState<File[]>([]);

  return (
    <div className="space-y-8 lg:space-y-10">
      <SectionMarker n="01" label="INGEST" />
      <div>
        <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-3">DROP UP TO 5 ARTIFACTS.</h2>
        <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl">
          PDFs · images · emails · spreadsheets · plain text. The factory reads them and reasons backwards to the embedded process.
        </p>
      </div>

      <FileDropZone files={files} onFiles={setFiles} disabled={busy} />

      {uploaded.length > 0 && existing && (
        <div className="border border-white/10 p-4 lg:p-6 font-mono text-xs">
          <div className="text-[10px] tracking-widest text-white/40 mb-2">PREVIOUSLY UPLOADED</div>
          <ul className="space-y-1 text-white/70">
            {uploaded.map((f, i) => (
              <li key={i}>{f.name} · {(f.size / 1024).toFixed(1)}KB · {f.type || 'unknown'}</li>
            ))}
          </ul>
        </div>
      )}

      {existing && <InferencePanel inference={existing} />}

      <div className="flex gap-3">
        <button
          disabled={files.length === 0 || busy}
          onClick={() => onSubmit(files)}
          className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {busy ? 'INGESTING…' : existing ? 'RE-INGEST →' : 'INGEST →'}
        </button>
      </div>
    </div>
  );
}

function FileDropZone({ files, onFiles, disabled }: { files: File[]; onFiles: (f: File[]) => void; disabled: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (disabled) return;
        onFiles(Array.from(e.dataTransfer.files).slice(0, 5));
      }}
      className={`border-2 border-dashed ${drag ? 'border-white bg-white/5' : 'border-white/20'} p-8 lg:p-14 text-center transition-colors`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(',')}
        onChange={(e) => onFiles(Array.from(e.target.files ?? []).slice(0, 5))}
        className="sr-only"
      />
      <div className="font-mono text-xs lg:text-sm text-white/70 mb-4 tracking-wider">DRAG FILES HERE OR</div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="px-5 lg:px-6 py-2.5 lg:py-3 border border-white/40 text-white font-mono text-[11px] lg:text-xs tracking-widest hover:border-white transition-colors disabled:opacity-30"
      >
        BROWSE FILES
      </button>
      <div className="mt-4 text-[10px] font-mono text-white/30 tracking-widest">{ACCEPTED_EXTENSIONS.join('  ·  ')}</div>
      {files.length > 0 && (
        <ul className="mt-6 text-left max-w-md mx-auto space-y-1 font-mono text-xs text-white/80">
          {files.map((f, i) => (
            <li key={i} className="border-l-2 border-white/40 pl-3">{f.name} · {(f.size / 1024).toFixed(1)}KB</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InferencePanel({ inference }: { inference: IngestOutput }) {
  return (
    <div className="border border-white/10 bg-white/[0.02] p-5 lg:p-8 font-mono text-xs lg:text-sm">
      <div className="text-[10px] tracking-widest text-white/40 mb-4">INFERRED · STAGE 01 OUTPUT</div>
      <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
        <Field label="BUSINESS" value={inference.inferred_business_type} />
        <Field label="PROCESS" value={inference.inferred_process_name} />
        <Field label="OUTPUT GOAL" value={inference.inferred_output_goal} full />
      </div>
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="text-[10px] tracking-widest text-white/40 mb-2">SUMMARY</div>
        <p className="text-white/80 leading-relaxed">{inference.summary}</p>
      </div>
      <div className="mt-6 pt-6 border-t border-white/10">
        <div className="text-[10px] tracking-widest text-white/40 mb-3">INFERRED STEPS</div>
        <ul className="space-y-1.5">
          {inference.inferred_steps.map((s, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="text-[10px] text-white/30 tabular-nums w-6">{String(i + 1).padStart(2, '0')}</span>
              <span className="flex-1 text-white/80">{s.step}</span>
              <span className="text-[9px] tracking-widest text-white/50 border border-white/20 px-1.5 py-0.5">{s.primitive.toUpperCase()}</span>
              <span className={`text-[10px] tabular-nums w-12 text-right ${s.confidence >= 0.8 ? 'text-green-300/80' : s.confidence >= 0.6 ? 'text-yellow-300/80' : 'text-orange-300/80'}`}>
                {(s.confidence * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 grid md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
        <Field label="INFERRED RULES" list={inference.inferred_rules} />
        <Field label="KNOWLEDGE ASSETS" list={inference.inferred_knowledge_assets} />
        <Field label="INFERRED INPUTS" list={inference.inferred_inputs} />
        <Field label="WHAT WE CANNOT SEE" list={inference.what_we_cannot_see} muted />
      </div>
    </div>
  );
}

function Field({ label, value, list, full, muted }: { label: string; value?: string; list?: string[]; full?: boolean; muted?: boolean }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <div className="text-[10px] tracking-widest text-white/40 mb-1.5">{label}</div>
      {value && <div className={muted ? 'text-white/50' : 'text-white/80'}>{value}</div>}
      {list && (
        <ul className="space-y-1">
          {list.map((item, i) => (
            <li key={i} className={muted ? 'text-white/50' : 'text-white/80'}>· {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Stage 02 — CLARIFY ───────────────────────────────────────────────────

function StageClarify({
  ingest,
  clarify,
  answers,
  busy,
  onGenerate,
  onSubmit,
}: {
  ingest: IngestOutput;
  clarify?: ClarifyOutput;
  answers?: ClarifyAnswers;
  busy: boolean;
  onGenerate: () => void;
  onSubmit: (a: ClarifyAnswers) => void;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    answers?.answers.forEach((a) => (init[a.id] = a.answer));
    clarify?.questions.forEach((q) => {
      if (!init[q.id] && q.suggested_answer) init[q.id] = q.suggested_answer;
    });
    return init;
  });

  useEffect(() => {
    if (!clarify) return;
    setDraft((prev) => {
      const next = { ...prev };
      for (const q of clarify.questions) {
        if (!next[q.id] && q.suggested_answer) next[q.id] = q.suggested_answer;
      }
      return next;
    });
  }, [clarify]);

  return (
    <div className="space-y-8 lg:space-y-10">
      <SectionMarker n="02" label="CLARIFY" />
      <div>
        <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-3">AT MOST 5 QUESTIONS.</h2>
        <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl">
          Each question drives a specific downstream decision. Tap suggested answers to confirm, or write your own.
        </p>
      </div>

      <InferencePanel inference={ingest} />

      {!clarify && (
        <button
          disabled={busy}
          onClick={onGenerate}
          className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white disabled:opacity-30 transition-all"
        >
          {busy ? 'THINKING…' : 'GENERATE QUESTIONS →'}
        </button>
      )}

      {clarify && (
        <div className="space-y-4 lg:space-y-6">
          {clarify.questions.map((q, i) => (
            <div key={q.id} className="border border-white/10 p-5 lg:p-6 font-mono text-xs lg:text-sm">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-white/40 tabular-nums w-6">Q{i + 1}</span>
                <div className="flex-1">
                  <div className="text-white mb-1.5">{q.question}</div>
                  <div className="text-[10px] text-white/40">Gap: {q.gap}</div>
                  <div className="text-[10px] text-white/40 italic">Why: {q.why_this_matters}</div>
                </div>
              </div>
              <textarea
                value={draft[q.id] ?? ''}
                onChange={(e) => setDraft({ ...draft, [q.id]: e.target.value })}
                placeholder={q.suggested_answer ?? 'Type your answer…'}
                rows={2}
                className="w-full bg-black border border-white/20 px-3 py-2 text-white/90 placeholder:text-white/30 focus:border-white focus:outline-none"
              />
            </div>
          ))}
          <button
            onClick={() => onSubmit({ answers: clarify.questions.map((q) => ({ id: q.id, answer: draft[q.id] ?? q.suggested_answer ?? '' })) })}
            className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white transition-all"
          >
            SUBMIT ANSWERS →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Stage 03 — SIMULATE ──────────────────────────────────────────────────

function StageSimulate({ simulate, busy, onGenerate }: { simulate?: SimulateOutput; busy: boolean; onGenerate: () => void }) {
  return (
    <div className="space-y-8 lg:space-y-10">
      <SectionMarker n="03" label="SIMULATE" />
      <div>
        <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-3">SCHEMA + 10 SYNTHETIC ROWS.</h2>
        <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl">
          The factory proposes the input contract and generates 7 happy-path + 3 deliberate edge-case rows. The schema becomes the swap interface for your real data.
        </p>
      </div>

      {!simulate && (
        <button
          disabled={busy}
          onClick={onGenerate}
          className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white disabled:opacity-30 transition-all"
        >
          {busy ? 'GENERATING…' : 'GENERATE SCHEMA + DATA →'}
        </button>
      )}

      {simulate && (
        <>
          <div className="border border-white/10 p-5 lg:p-6 font-mono text-xs">
            <div className="text-[10px] tracking-widest text-white/40 mb-3">INPUT SCHEMA · {simulate.schema.length} FIELDS</div>
            <ul className="space-y-1.5">
              {simulate.schema.map((f) => (
                <li key={f.name} className="flex items-baseline gap-3">
                  <span className="text-white">{f.name}</span>
                  <span className="text-white/40 text-[10px]">{f.type === 'enum' ? `enum(${(f.enum_values ?? []).join('|')})` : f.type}</span>
                  {f.required && <span className="text-[9px] text-orange-300/80 border border-orange-300/30 px-1">REQ</span>}
                  <span className="text-white/60 flex-1">{f.description}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-white/10 font-mono text-xs">
            <div className="px-4 py-2 border-b border-white/10 text-[10px] tracking-widest text-white/40 bg-white/[0.02]">
              SYNTHETIC DATA · {simulate.rows.length} ROWS ({simulate.rows.filter((r) => r.kind === 'happy').length} HAPPY · {simulate.rows.filter((r) => r.kind === 'edge').length} EDGE)
            </div>
            <ul className="divide-y divide-white/5">
              {simulate.rows.map((r) => (
                <li key={r.row_id} className="p-3 lg:p-4">
                  <div className="flex items-baseline gap-3 mb-1.5">
                    <span className="text-white/40 text-[10px] tabular-nums w-12">{r.row_id}</span>
                    <span className={`text-[9px] tracking-widest px-1.5 py-0.5 border ${r.kind === 'edge' ? 'border-orange-400/40 text-orange-300/80' : 'border-white/20 text-white/60'}`}>
                      {r.kind.toUpperCase()}
                    </span>
                    {r.edge_case_description && <span className="text-white/60 text-[11px] italic">{r.edge_case_description}</span>}
                  </div>
                  <pre className="text-white/70 text-[11px] overflow-x-auto leading-snug">{JSON.stringify(r.data, null, 2)}</pre>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stage 04 — GENERATE ──────────────────────────────────────────────────

function StageGenerate({ generate, busy, onGenerate }: { generate?: GenerateOutput; busy: boolean; onGenerate: () => void }) {
  return (
    <div className="space-y-8 lg:space-y-10">
      <SectionMarker n="04" label="GENERATE" />
      <div>
        <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-3">THE FULL WORKFLOW.</h2>
        <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl">
          Every step tagged with primitive, actor, model, prompt, inputs, outputs, and RAG assets. This is the runnable definition.
        </p>
      </div>

      {!generate && (
        <button
          disabled={busy}
          onClick={onGenerate}
          className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white disabled:opacity-30 transition-all"
        >
          {busy ? 'GENERATING WORKFLOW… (~30s)' : 'GENERATE WORKFLOW →'}
        </button>
      )}

      {generate && (
        <>
          <div className="border border-white/10 p-5 lg:p-6 font-mono text-xs lg:text-sm">
            <div className="text-[10px] tracking-widest text-white/40 mb-2">WORKFLOW</div>
            <div className="text-white text-base lg:text-xl mb-2">{generate.workflow_name}</div>
            <p className="text-white/70 leading-relaxed">{generate.workflow_description}</p>
          </div>

          <div className="border border-white/10 font-mono text-xs">
            <div className="px-4 py-2 border-b border-white/10 text-[10px] tracking-widest text-white/40 bg-white/[0.02]">
              STEPS · {generate.steps.length}
            </div>
            <ul className="divide-y divide-white/5">
              {generate.steps.map((step) => (
                <li key={step.id} className="p-3 lg:p-4">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-white/40 text-[10px] tabular-nums w-10">{step.id}</span>
                    <span className="text-white flex-1 min-w-0 text-[13px]">{step.name}</span>
                    <span className="text-[9px] tracking-widest text-white/60 border border-white/20 px-1.5 py-0.5">{step.primitive.toUpperCase()}</span>
                    <span className={`text-[9px] tracking-widest px-1.5 py-0.5 border ${step.actor === 'human' ? 'border-orange-400/40 text-orange-300/80' : step.actor === 'hybrid' ? 'border-yellow-400/40 text-yellow-300/80' : 'border-white/20 text-white/60'}`}>
                      {step.actor.toUpperCase()}
                    </span>
                    <span className="text-[9px] text-white/40 tracking-widest">{step.model}</span>
                  </div>
                  <div className="text-[10px] text-white/40 mt-1">{step.rationale}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border border-white/10 p-5 lg:p-6 font-mono text-xs">
            <div className="text-[10px] tracking-widest text-white/40 mb-3">RAG LIBRARY · {generate.rag_library.length} ASSETS</div>
            <ul className="space-y-1.5">
              {generate.rag_library.map((a) => (
                <li key={a.asset_name}>
                  <span className="text-white">{a.asset_name}</span>
                  <span className="text-white/40 text-[10px] ml-2">({a.asset_type})</span>
                  <div className="text-white/60 ml-0">{a.description}</div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Stage 05 — DELIVER ───────────────────────────────────────────────────

function StageDeliver({
  workflow,
  events,
  busy,
  onRun,
  onDownloadSpec,
  onDownloadDocx,
}: {
  workflow: GenerateOutput;
  events: ExecEvent[];
  busy: boolean;
  onRun: () => void;
  onDownloadSpec: () => void;
  onDownloadDocx: () => void;
}) {
  const summary = events.find((e): e is Extract<ExecEvent, { type: 'done' }> => e.type === 'done')?.summary;
  const rowStates = aggregateRowStates(events);
  const specReady = events.some((e) => e.type === 'spec');

  return (
    <div className="space-y-8 lg:space-y-10">
      <SectionMarker n="05" label="DELIVER" />
      <div>
        <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-3">SPEC + REAL EXECUTION.</h2>
        <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl">
          Downloads a Markdown spec, then runs the workflow against all 10 synthetic rows in real time. Each step executes, each output flows, each edge case fires.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={busy}
          onClick={onRun}
          className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white disabled:opacity-30 transition-all"
        >
          {busy ? 'EXECUTING…' : summary ? 'RE-RUN EXECUTION →' : 'RUN EXECUTION →'}
        </button>
        {specReady && (
          <>
            <button
              onClick={onDownloadDocx}
              className="px-6 lg:px-8 py-3 lg:py-4 border-2 border-white/30 text-white font-mono text-xs lg:text-sm tracking-widest hover:border-white transition-all"
            >
              DOWNLOAD WORD DOC (.docx)
            </button>
            <button
              onClick={onDownloadSpec}
              className="px-6 lg:px-8 py-3 lg:py-4 border border-white/20 text-white/70 font-mono text-xs lg:text-sm tracking-widest hover:border-white/60 hover:text-white transition-all"
            >
              MARKDOWN (.md)
            </button>
          </>
        )}
      </div>

      {rowStates.length > 0 && (
        <div className="border border-white/10 font-mono text-xs">
          <div className="px-4 py-2 border-b border-white/10 text-[10px] tracking-widest text-white/40 bg-white/[0.02]">
            EXECUTION TRACE · {rowStates.length} ROWS
          </div>
          <ul className="divide-y divide-white/5">
            {rowStates.map((r) => (
              <li key={r.row_id} className="p-3 lg:p-4">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-white/40 text-[10px] tabular-nums w-12">{r.row_id}</span>
                  <span className={`text-[9px] tracking-widest px-1.5 py-0.5 border ${r.kind === 'edge' ? 'border-orange-400/40 text-orange-300/80' : 'border-white/20 text-white/60'}`}>
                    {r.kind.toUpperCase()}
                  </span>
                  <div className="flex-1 h-2 bg-white/5 overflow-hidden">
                    <div
                      className={`h-full ${r.status === 'success' ? 'bg-green-400/70' : r.status === 'partial' ? 'bg-yellow-400/70' : r.status === 'failure' ? 'bg-red-400/70' : 'bg-white/40'} transition-all duration-200`}
                      style={{ width: `${(r.stepsDone / workflow.steps.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-white/50 tabular-nums w-12 text-right">{r.stepsDone}/{workflow.steps.length}</span>
                  {r.status && (
                    <span className={`text-[9px] tracking-widest ${r.status === 'success' ? 'text-green-300/80' : r.status === 'partial' ? 'text-yellow-300/80' : 'text-red-300/80'}`}>
                      {r.status.toUpperCase()}
                    </span>
                  )}
                </div>
                {r.lastTrace && <div className="text-[10px] text-white/40 italic">{r.lastTrace}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="border border-white/30 p-5 lg:p-8 font-mono">
          <div className="text-[10px] tracking-widest text-white/40 mb-4">EXECUTION SUMMARY</div>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <div className="text-[10px] tracking-widest text-white/40 mb-1">ROWS</div>
              <div className="text-white text-xl lg:text-2xl">{summary.total_rows}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-white/40 mb-1">HAPPY PASSED</div>
              <div className="text-green-300/90 text-xl lg:text-2xl">{summary.happy_rows_passed}/{summary.total_rows - 3}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-white/40 mb-1">EDGE CAUGHT</div>
              <div className="text-orange-300/90 text-xl lg:text-2xl">{summary.edge_rows_caught}/3</div>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-white/40 mb-1">LLM CALLS</div>
              <div className="text-white text-xl lg:text-2xl">{summary.total_llm_calls}</div>
            </div>
            <div>
              <div className="text-[10px] tracking-widest text-white/40 mb-1">DURATION</div>
              <div className="text-white text-xl lg:text-2xl">{(summary.total_duration_ms / 1000).toFixed(1)}s</div>
            </div>
          </div>
        </div>
      )}

      <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row gap-3">
        <Link
          href="/example"
          className="inline-flex items-center justify-center px-6 lg:px-8 py-3 lg:py-4 border-2 border-white/30 text-white font-mono text-xs lg:text-sm tracking-widest hover:border-white transition-all"
        >
          SEE THE OPERATING STACK
        </Link>
      </div>
    </div>
  );
}

function aggregateRowStates(events: ExecEvent[]) {
  const byRow = new Map<string, { row_id: string; kind: 'happy' | 'edge'; stepsDone: number; status?: string; lastTrace?: string }>();
  for (const e of events) {
    if (e.type === 'row_started') {
      byRow.set(e.row_id, { row_id: e.row_id, kind: e.kind, stepsDone: 0 });
    } else if (e.type === 'step_finished') {
      const r = byRow.get(e.row_id);
      if (r) {
        r.stepsDone++;
        r.lastTrace = e.trace_message ?? r.lastTrace;
      }
    } else if (e.type === 'row_finished') {
      const r = byRow.get(e.row_id);
      if (r) r.status = e.status;
    }
  }
  return Array.from(byRow.values());
}

function SectionMarker({ n, label }: { n: string; label: string }) {
  return (
    <div className="flex items-center gap-2 opacity-60">
      <div className="w-8 h-px bg-white"></div>
      <span className="text-white text-[10px] font-mono tracking-wider">{n} / {label}</span>
      <div className="flex-1 h-px bg-white"></div>
    </div>
  );
}
