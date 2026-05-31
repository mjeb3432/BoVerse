'use client';

// The BoVerse factory — the business-user surface. The user describes an
// outcome, uploads evidence, answers a few questions, then reviews ONLY two
// things: a sample OUTPUT and a sample-INPUTS pack. They comment / edit inputs
// and approve. All machinery (canonical store, archetype, rules) is hidden
// behind the OPERATOR drawer. Aesthetic: Living Swarm — deep space-black,
// frosted glass, cyan/indigo glow, pill buttons.

import { useCallback, useMemo, useRef, useState } from 'react';
import SwarmCanvas from '@/components/swarm/swarm-canvas';
import SiteHeader from '@/components/site/site-header';

type Phase = 'intake' | 'discovering' | 'questions' | 'review' | 'approved' | 'error';

interface Question { gap_id: string; suggested_question: string | null; severity: string; missing_attribute?: string | null }
interface SampleInput { input_name: string; input_type: string; format: string; rendered: string; example_value: unknown }
interface SampleOutput { output_name: string; output_type: string; output_format: string; required_sections: string[]; rendered_sample: string; computed_fields: Record<string, unknown> }
interface WdsSummary { primary_archetype: string; complexity: string; overall_confidence: number; required_components: string[]; unnecessary_components: string[] }

// Severity → swarm-palette accent (style only). amber = edge/critical, indigo = secondary, muted = low.
const SEV_COLOR: Record<string, string> = {
  critical: '#ffb020',
  high: '#ffb020',
  medium: '#6e8bff',
  low: '#6c779b',
};

export default function FactoryPage() {
  const [phase, setPhase] = useState<Phase>('intake');
  const [outcome, setOutcome] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sampleOutput, setSampleOutput] = useState<SampleOutput | null>(null);
  const [sampleInputs, setSampleInputs] = useState<SampleInput[]>([]);
  const [wds, setWds] = useState<WdsSummary | null>(null);
  const [comment, setComment] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => f.name + f.size));
      const next = [...prev];
      for (const f of Array.from(list)) if (!seen.has(f.name + f.size)) next.push(f);
      return next;
    });
  }, []);

  async function jsonFetch(url: string, init?: RequestInit) {
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 409) throw new Error(data?.message || data?.error || `${res.status}`);
    return { res, data };
  }

  async function runSpecify(sid: string) {
    setStatus('Building the sample output and inputs…');
    const { data } = await jsonFetch('/api/factory/swarm1/specify', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sid }),
    });
    if (data.error) throw new Error(data.message || data.error);
    setSampleOutput(data.sample_output);
    setSampleInputs(data.sample_inputs ?? []);
    setWds(data.wds_summary ?? null);
    setPhase('review');
  }

  async function discover() {
    if (files.length === 0) { setError('Upload at least one file describing what you have.'); return; }
    setError(''); setPhase('discovering');
    try {
      const fd = new FormData();
      fd.append('outcome', outcome);
      for (const f of files) fd.append('files', f);
      setStatus('Reading your evidence…');
      const { data: ext } = await jsonFetch('/api/factory/swarm1/extract', { method: 'POST', body: fd });
      if (ext.error) throw new Error(ext.message || ext.error);
      const sid = ext.session_id as string;
      setSessionId(sid);

      setStatus('Inferring the workflow shape…');
      await jsonFetch('/api/factory/swarm1/classify', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sid }),
      });

      setStatus('Checking what we still need to ask…');
      const { data: gaps } = await jsonFetch('/api/factory/swarm1/gaps', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sid }),
      });
      if ((gaps.questions ?? []).length > 0) {
        setQuestions(gaps.questions);
        setPhase('questions');
        return;
      }
      await runSpecify(sid);
    } catch (e) {
      setError((e as Error).message); setPhase('error');
    }
  }

  async function submitAnswers() {
    if (!sessionId) return;
    setError(''); setPhase('discovering');
    try {
      setStatus('Applying your answers…');
      await jsonFetch('/api/factory/swarm1/gaps', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answers: questions.map((q) => ({ gap_id: q.gap_id, answer: answers[q.gap_id] ?? '' })) }),
      });
      await runSpecify(sessionId);
    } catch (e) { setError((e as Error).message); setPhase('error'); }
  }

  async function editInput(input: SampleInput, raw: string) {
    if (!sessionId) return;
    let example_value: unknown = raw;
    try { example_value = JSON.parse(raw); } catch { /* keep as string */ }
    setStatus('Re-rendering…');
    try {
      const { data } = await jsonFetch('/api/factory/swarm1/review', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, kind: 'input_change', input_name: input.input_name, example_value }),
      });
      if (data.sample_output) setSampleOutput(data.sample_output);
      if (data.sample_inputs) setSampleInputs(data.sample_inputs);
      setStatus('');
    } catch (e) { setError((e as Error).message); }
  }

  async function sendComment(target: string) {
    if (!sessionId || !comment.trim()) return;
    await jsonFetch('/api/factory/swarm1/review', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, kind: 'comment', target, text: comment }),
    }).catch(() => ({}));
    setComment('');
    setStatus('Comment noted.');
  }

  async function approve() {
    if (!sessionId) return;
    setError('');
    const { res, data } = await jsonFetch('/api/factory/swarm1/review', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, kind: 'approve' }),
    });
    if (res.status === 409) { setError(data.message || 'Resolve the open questions first.'); return; }
    // Approval releases the Build swarm — build the implementation, then show it.
    setPhase('approved'); setStatus('Building the implementation…');
    try {
      const { data: b } = await jsonFetch('/api/factory/swarm2/build', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }),
      });
      if (b.build_id) { window.location.href = `/factory/${b.build_id}`; return; }
      setError(b.message || b.error || 'Build failed.');
    } catch (e) { setError((e as Error).message); }
  }

  const computed = useMemo(() => Object.entries(sampleOutput?.computed_fields ?? {}), [sampleOutput]);

  return (
    <main id="main" className="relative min-h-screen">
      {/* Calm ambient backdrop — the Living Swarm, dimmed and non-interactive. */}
      <SwarmCanvas density="calm" interactive={false} dim={0.45} />
      <SiteHeader />

      <div className="sw-content" style={{ paddingTop: 96 }}>
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8 lg:px-10 pb-24 lg:pb-32 pt-8 lg:pt-12">
          {/* eyebrow */}
          <span className="sw-eyebrow mb-6">
            <span className="sw-spark" aria-hidden="true" />
            Factory · 001
          </span>

          <h1 className="sw-h sw-gradient text-4xl lg:text-6xl mb-5">Describe. Upload. Approve.</h1>
          <p className="sw-muted text-sm lg:text-base leading-relaxed max-w-2xl mb-10">
            Tell us the outcome you want and drop in whatever you already have. BoVerse infers the workflow and shows you a sample result and the inputs that produce it. Comment, tweak, approve — we build it.
          </p>

          {/* progress / status line */}
          {status && phase !== 'error' && (
            <div className="sw-kicker mb-6" style={{ color: 'var(--sw-cyan)' }} aria-live="polite">{status}</div>
          )}
          {error && (
            <div role="alert" className="text-xs p-3.5 mb-6 rounded-2xl" style={{ color: '#ff9a9a', border: '1px solid rgba(255,120,120,0.5)', background: 'rgba(255,80,80,0.06)' }}>{error}</div>
          )}

          {/* ── INTAKE ── */}
          {phase === 'intake' && (
            <div className="space-y-6">
              <div>
                <label htmlFor="outcome" className="sw-kicker mb-3">Outcome · what do you want?</label>
                <textarea id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={3}
                  placeholder="e.g. Turn an inbound brief into a priced proposal in minutes."
                  className="sw-field w-full text-sm p-3.5" />
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className="glass p-8 text-center transition-colors"
                style={{ borderStyle: 'dashed', borderColor: dragging ? 'var(--sw-cyan)' : 'var(--sw-glass-edge)', background: dragging ? 'rgba(56,225,255,0.06)' : 'var(--sw-glass)' }}
              >
                <div className="sw-kicker mb-3 justify-center">Evidence · drop files</div>
                <p className="sw-muted text-xs mb-4">Notes, SOPs, spreadsheets, sample outputs, exports, screenshots.</p>
                <button onClick={() => fileRef.current?.click()} className="sw-btn ghost sm">Browse</button>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </div>
              {files.length > 0 && (
                <ul className="sw-card divide-y" style={{ borderColor: 'var(--sw-line)' }}>
                  {files.map((f, i) => (
                    <li key={f.name + i} className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ borderColor: 'var(--sw-line)' }}>
                      <span className="sw-muted sw-mono">{f.name}</span>
                      <button aria-label={`remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="sw-muted-2 transition-colors hover:text-[#ffb020]">×</button>
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={discover} className="sw-btn">Discover →</button>
            </div>
          )}

          {/* ── QUESTIONS ── */}
          {phase === 'questions' && (
            <div className="space-y-5">
              <div className="sw-kicker">A few things we couldn&apos;t infer</div>
              {questions.map((q) => (
                <div key={q.gap_id} className="glass p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="sw-badge" style={{ borderColor: SEV_COLOR[q.severity] ?? SEV_COLOR.low, color: SEV_COLOR[q.severity] ?? SEV_COLOR.low }}>
                      <span className="sw-mini" style={{ background: SEV_COLOR[q.severity] ?? SEV_COLOR.low, boxShadow: `0 0 10px ${SEV_COLOR[q.severity] ?? SEV_COLOR.low}` }} />
                      {q.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--sw-white)' }}>{q.suggested_question}</p>
                  <input value={answers[q.gap_id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.gap_id]: e.target.value }))}
                    className="sw-field w-full text-sm p-2.5" />
                </div>
              ))}
              <button onClick={submitAnswers} className="sw-btn">Submit →</button>
            </div>
          )}

          {/* ── REVIEW (the two surfaces) ── */}
          {phase === 'review' && sampleOutput && (
            <div className="space-y-10">
              <section>
                <div className="sw-kicker mb-3">Sample output · {sampleOutput.output_name.toUpperCase()}</div>
                <div className="glass p-5 lg:p-6">
                  <pre className="sw-mono whitespace-pre-wrap text-xs lg:text-sm leading-relaxed" style={{ color: 'var(--sw-white)' }}>{sampleOutput.rendered_sample}</pre>
                </div>
                {computed.length > 0 && (
                  <div className="sw-card mt-3 divide-y" style={{ borderColor: 'var(--sw-line)' }}>
                    {computed.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-2 gap-3 px-4 py-2.5 text-xs" style={{ borderColor: 'var(--sw-line)' }}>
                        <span className="sw-muted-2 sw-mono">{k}</span>
                        <span className="sw-mono text-right" style={{ color: 'var(--sw-white)' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="sw-kicker mb-3">Sample inputs · edit any value to re-render</div>
                <div className="space-y-3">
                  {sampleInputs.map((si) => (
                    <details key={si.input_name} className="sw-card">
                      <summary className="cursor-pointer px-4 py-3.5 text-sm flex items-center justify-between" style={{ color: 'var(--sw-white)' }}>
                        <span>{si.input_name}</span>
                        <span className="sw-mono text-[10px] tracking-widest sw-muted-2">{si.input_type} · {si.format}</span>
                      </summary>
                      <div className="px-4 pb-4">
                        <pre className="sw-mono whitespace-pre-wrap text-[11px] sw-muted mb-3">{si.rendered}</pre>
                        <InputEditor input={si} onSave={editInput} />
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="sw-kicker">Comment</div>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                  placeholder="Anything look off? e.g. &quot;the rush fee looks too low&quot;"
                  className="sw-field w-full text-sm p-3.5" />
                <div>
                  <button onClick={() => sendComment('output')} className="sw-btn ghost sm">Comment →</button>
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-4">
                <button onClick={approve} className="sw-btn">Approve →</button>
                <span className="sw-muted-2 text-xs">Approval releases the build.</span>
              </div>

              {wds && <OperatorDrawer wds={wds} />}
            </div>
          )}

          {/* ── APPROVED ── */}
          {phase === 'approved' && (
            <div className="space-y-6">
              <div className="glass p-6">
                <div className="sw-badge mb-3" style={{ borderColor: 'rgba(56,225,255,0.4)', color: 'var(--sw-cyan)' }}>
                  <span className="sw-mini cyan" />
                  APPROVED
                </div>
                <p className="sw-muted text-sm">The specification is approved and the Build swarm is released. The build view appears here once Swarm 2 is wired.</p>
              </div>
              {wds && <OperatorDrawer wds={wds} />}
            </div>
          )}

          {phase === 'error' && (
            <button onClick={() => { setPhase('intake'); setError(''); }} className="sw-btn ghost sm">← Start over</button>
          )}
        </div>
      </div>

      {/* Dark-glass field treatment: transparent bg, glass edge, cyan focus. */}
      <style jsx>{`
        .sw-field {
          background: rgba(8, 12, 24, 0.45);
          border: 1px solid var(--sw-glass-edge);
          border-radius: 14px;
          color: var(--sw-white);
          outline: none;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: border-color 0.25s var(--sw-ease), box-shadow 0.25s var(--sw-ease);
        }
        .sw-field::placeholder { color: var(--sw-muted-2); }
        .sw-field:focus,
        .sw-field:focus-visible {
          border-color: var(--sw-cyan);
          box-shadow: 0 0 0 1px rgba(56, 225, 255, 0.4), 0 0 30px rgba(56, 225, 255, 0.12);
        }
      `}</style>
    </main>
  );
}

function InputEditor({ input, onSave }: { input: SampleInput; onSave: (i: SampleInput, raw: string) => void }) {
  const initial = typeof input.example_value === 'string' ? input.example_value : JSON.stringify(input.example_value, null, 2);
  const [raw, setRaw] = useState(initial);
  return (
    <div>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={5}
        className="sw-ed sw-mono w-full p-2.5 text-[11px]" />
      <div>
        <button onClick={() => onSave(input, raw)} className="sw-btn ghost sm mt-2">Re-render →</button>
      </div>
      <style jsx>{`
        .sw-ed {
          background: rgba(8, 12, 24, 0.55);
          border: 1px solid var(--sw-line);
          border-radius: 12px;
          color: var(--sw-white);
          outline: none;
          transition: border-color 0.25s var(--sw-ease), box-shadow 0.25s var(--sw-ease);
        }
        .sw-ed:focus,
        .sw-ed:focus-visible {
          border-color: var(--sw-cyan);
          box-shadow: 0 0 0 1px rgba(56, 225, 255, 0.35);
        }
      `}</style>
    </div>
  );
}

function OperatorDrawer({ wds }: { wds: WdsSummary }) {
  return (
    <details className="sw-card mt-4">
      <summary className="cursor-pointer px-4 py-3.5 text-[11px] tracking-widest sw-muted-2 sw-mono">OPERATOR · INTERNALS</summary>
      <div className="px-4 pb-4 text-xs sw-muted space-y-2">
        <div>archetype: <span style={{ color: 'var(--sw-white)' }}>{wds.primary_archetype}</span> · complexity: {wds.complexity} · confidence: {(wds.overall_confidence * 100).toFixed(0)}%</div>
        <div>build: <span style={{ color: 'var(--sw-white)' }}>{wds.required_components.join(', ')}</span></div>
        <div className="sw-muted-2">refused: {wds.unnecessary_components.join(', ') || '—'}</div>
      </div>
    </details>
  );
}
