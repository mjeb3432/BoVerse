'use client';

// The BoVerse factory — the business-user surface. The user describes an
// outcome, uploads evidence, answers a few questions, then reviews ONLY two
// things: a sample OUTPUT and a sample-INPUTS pack. They comment / edit inputs
// and approve. All machinery (canonical store, archetype, rules) is hidden
// behind the OPERATOR drawer. Aesthetic: Editorial Paper — warm paper ground,
// ink type, hairline rules, one vermilion signal, square corners.

import { Fragment, useCallback, useMemo, useRef, useState } from 'react';
import SwarmCanvas from '@/components/swarm/swarm-canvas';
import SiteHeader from '@/components/site/site-header';

type Phase = 'intake' | 'discovering' | 'questions' | 'review' | 'approved' | 'error';

// Guided progress — which of the four user-facing steps each phase maps to.
const FLOW_STEPS = ['Describe', 'Discover', 'Review', 'Build'] as const;
const STEP_INDEX: Record<Phase, number> = {
  intake: 0,
  discovering: 1,
  questions: 1,
  review: 2,
  approved: 3,
  error: 1,
};

interface Question { gap_id: string; suggested_question: string | null; severity: string; missing_attribute?: string | null }
interface SampleInput { input_name: string; input_type: string; format: string; rendered: string; example_value: unknown }
interface SampleOutput { output_name: string; output_type: string; output_format: string; required_sections: string[]; rendered_sample: string; computed_fields: Record<string, unknown> }
interface WdsSummary { primary_archetype: string; complexity: string; overall_confidence: number; required_components: string[]; unnecessary_components: string[] }

// Pre-upload Setup — four plain-English questions that anchor Discovery before
// it reads the evidence. Each field is optional; the more the user fills in,
// the more deterministic the downstream sample becomes. These also become the
// integration-points record the downstream Build swarm consumes at handoff.
interface SetupIntake {
  source: string;        // "where does the work come in from"
  output: string;        // "what do you want to produce"
  destination: string;   // "where should the result land"
  connection: string;    // "any specific connection details or sign-off contact"
}
const EMPTY_SETUP: SetupIntake = { source: '', output: '', destination: '', connection: '' };
function setupIsEmpty(s: SetupIntake): boolean {
  return !s.source.trim() && !s.output.trim() && !s.destination.trim() && !s.connection.trim();
}

// Severity → editorial accent (style only). vermilion-ink = critical/high, ink = medium, faint = low.
const SEV_COLOR: Record<string, string> = {
  critical: '#c0341f',
  high: '#c0341f',
  medium: 'var(--ink)',
  low: 'var(--ink-faint)',
};

export default function FactoryPage() {
  const [phase, setPhase] = useState<Phase>('intake');
  const [outcome, setOutcome] = useState('');
  const [setup, setSetup] = useState<SetupIntake>(EMPTY_SETUP);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
    if (busy) return;
    setError(''); setBusy(true); setPhase('discovering');
    try {
      const fd = new FormData();
      fd.append('outcome', outcome);
      if (!setupIsEmpty(setup)) fd.append('setup_intake', JSON.stringify(setup));
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
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswers() {
    if (!sessionId || busy) return;
    setError(''); setBusy(true); setPhase('discovering');
    try {
      setStatus('Applying your answers…');
      await jsonFetch('/api/factory/swarm1/gaps', {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answers: questions.map((q) => ({ gap_id: q.gap_id, answer: answers[q.gap_id] ?? '' })) }),
      });
      await runSpecify(sessionId);
    } catch (e) { setError((e as Error).message); setPhase('error'); }
    finally { setBusy(false); }
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
    if (!sessionId || busy) return;
    setError(''); setBusy(true);
    try {
      const { res, data } = await jsonFetch('/api/factory/swarm1/review', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, kind: 'approve' }),
      });
      if (res.status === 409) { setError(data.message || 'Resolve the open questions first.'); return; }
      // Approval releases the Build swarm — build the implementation, then show it.
      setPhase('approved'); setStatus('Reading the approved spec…');
      const { data: b } = await jsonFetch('/api/factory/swarm2/build', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }),
      });
      // Success → hand off to the bundle view (the object ledger lives there).
      if (b.build_id) { setStatus('Done — opening your bundle…'); window.location.href = `/factory/${b.build_id}`; return; }
      setError(b.message || b.error || 'Build failed.');
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
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
            Factory / 001
          </span>

          <h1 className="sw-h sw-gradient text-4xl lg:text-6xl mb-5">Describe. Upload. Approve.</h1>
          <p className="sw-muted text-sm lg:text-base leading-relaxed max-w-2xl mb-10">
            Tell us the outcome you want and drop in whatever you already have. BoVerse infers the workflow and shows you a sample result and the inputs that produce it. Comment, tweak, approve — we build it.
          </p>

          {/* guided progress */}
          <nav className="sw-stepper" aria-label="Progress">
            {FLOW_STEPS.map((label, i) => {
              const ai = STEP_INDEX[phase];
              const state = i < ai ? 'done' : i === ai ? 'active' : 'todo';
              return (
                <Fragment key={label}>
                  <span className="sw-stepper-item" data-state={state} aria-current={state === 'active' ? 'step' : undefined}>
                    <span className="sw-stepper-num" aria-hidden="true">{state === 'done' ? '✓' : i + 1}</span>
                    <span className="sw-stepper-label">{label}</span>
                  </span>
                  {i < FLOW_STEPS.length - 1 && <span className="sw-stepper-line" aria-hidden="true" />}
                </Fragment>
              );
            })}
          </nav>

          {/* progress / status line */}
          {status && phase !== 'error' && (
            <div className="sw-kicker mb-6" style={{ color: 'var(--signal-ink)' }} aria-live="polite">{status}</div>
          )}
          {error && (
            <div role="alert" className="text-xs p-3.5 mb-6" style={{ color: 'var(--ink)', borderLeft: '2px solid var(--signal)', background: 'var(--paper-2)', borderRadius: 2 }}>{error}</div>
          )}

          {/* ── INTAKE ── */}
          {phase === 'intake' && (
            <div className="space-y-6">
              {/* Pre-upload Setup — four plain-English questions. All optional;
                 they anchor Discovery and become the integration-points record
                 the downstream Build swarm picks up at handoff. */}
              <SetupBlock setup={setup} onChange={setSetup} />

              <div>
                <label htmlFor="outcome" className="sw-kicker mb-3">Outcome / what do you want?</label>
                <textarea id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={3}
                  placeholder="e.g. Turn an inbound brief into a priced proposal in minutes."
                  className="sw-field w-full text-sm p-3.5" />
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
                className="glass p-8 text-center transition-colors"
                style={{ borderStyle: 'dashed', borderColor: dragging ? 'var(--signal)' : 'var(--rule-2)', background: dragging ? 'var(--paper-3)' : 'var(--paper-2)' }}
              >
                <div className="sw-kicker mb-3 justify-center">Evidence / drop files</div>
                <p className="sw-muted text-xs mb-4">Notes, SOPs, spreadsheets, sample outputs, exports, screenshots.</p>
                <button onClick={() => fileRef.current?.click()} className="sw-btn ghost sm">Browse</button>
                <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </div>
              {files.length > 0 && (
                <ul className="sw-card divide-y" style={{ borderColor: 'var(--rule)' }}>
                  {files.map((f, i) => (
                    <li key={f.name + i} className="flex items-center justify-between px-4 py-2.5 text-xs" style={{ borderColor: 'var(--rule)' }}>
                      <span className="sw-muted sw-mono">{f.name}</span>
                      <button aria-label={`remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="sw-muted-2 transition-colors hover:text-[var(--signal-ink)]">×</button>
                    </li>
                  ))}
                </ul>
              )}
              <button onClick={discover} disabled={busy} className="sw-btn">{busy ? 'Working…' : 'Discover'}</button>
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
                      <span className="sw-mini" style={{ background: SEV_COLOR[q.severity] ?? SEV_COLOR.low }} />
                      {q.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: 'var(--ink)' }}>{q.suggested_question}</p>
                  <input value={answers[q.gap_id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.gap_id]: e.target.value }))}
                    className="sw-field w-full text-sm p-2.5" />
                </div>
              ))}
              <button onClick={submitAnswers} disabled={busy} className="sw-btn">{busy ? 'Working…' : 'Submit'}</button>
            </div>
          )}

          {/* ── REVIEW (the two surfaces) ── */}
          {phase === 'review' && sampleOutput && (
            <div className="space-y-10">
              <section>
                <div className="sw-kicker mb-3">Sample output / {sampleOutput.output_name.toUpperCase()}</div>
                <div className="glass p-5 lg:p-6">
                  <pre className="sw-mono whitespace-pre-wrap text-xs lg:text-sm leading-relaxed" style={{ color: 'var(--ink)' }}>{sampleOutput.rendered_sample}</pre>
                </div>
                {computed.length > 0 && (
                  <div className="sw-card mt-3 divide-y" style={{ borderColor: 'var(--rule)' }}>
                    {computed.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-2 gap-3 px-4 py-2.5 text-xs" style={{ borderColor: 'var(--rule)' }}>
                        <span className="sw-muted-2 sw-mono">{k}</span>
                        <span className="sw-mono text-right" style={{ color: 'var(--ink)' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <div className="sw-kicker mb-3">Sample inputs</div>
                {sampleInputs.length === 0 && (
                  <div className="sw-card" style={{ padding: '18px 20px' }}>
                    <p className="sw-muted text-sm" style={{ margin: 0 }}>
                      No per-run inputs to configure — this workflow is driven directly by the evidence you provided.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {sampleInputs.map((si) => (
                    <details key={si.input_name} className="sw-card">
                      <summary className="cursor-pointer px-4 py-3.5 text-sm flex items-center justify-between" style={{ color: 'var(--ink)' }}>
                        <span>{si.input_name}</span>
                        <span className="sw-mono text-[10px] tracking-widest sw-muted-2">{si.input_type} / {si.format}</span>
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
                  <button onClick={() => sendComment('output')} className="sw-btn ghost sm">Comment</button>
                </div>
              </section>

              <div className="flex flex-wrap items-center gap-4">
                <button onClick={approve} disabled={busy} className="sw-btn">{busy ? 'Approving…' : 'Approve'}</button>
              </div>

              {wds && <OperatorDrawer wds={wds} />}
            </div>
          )}

          {/* ── APPROVED → BUILDING (Swarm 2) ── */}
          {phase === 'approved' && (
            error ? (
              <div className="glass mx-auto" style={{ maxWidth: 520, padding: 'clamp(30px,5vw,44px)', textAlign: 'center' }}>
                <div className="sw-badge mx-auto mb-4" style={{ borderColor: 'var(--signal)', color: 'var(--signal-ink)' }}>
                  <span className="sw-mini" style={{ background: 'var(--signal)' }} aria-hidden="true" />
                  BUILD FAILED
                </div>
                <p className="sw-muted text-sm mb-5" role="alert">{error}</p>
                <button onClick={approve} disabled={busy} className="sw-btn ghost sm">Retry build</button>
              </div>
            ) : (
              <div className="glass mx-auto" style={{ maxWidth: 520, padding: 'clamp(36px,6vw,56px)', textAlign: 'center' }}>
                <div className="sw-orbit" aria-hidden="true">
                  <i />
                  <i className="b" />
                  <span />
                </div>
                <div className="sw-kicker justify-center mb-3" style={{ color: 'var(--ink)' }}>Swarm 2 / Build</div>
                <h2 className="sw-h sw-gradient" style={{ fontSize: 'clamp(22px,3.6vw,30px)', marginBottom: 12 }}>Assembling your workflow</h2>
                <p className="sw-muted text-sm mx-auto" style={{ maxWidth: '34ch' }} aria-live="polite">
                  {status || 'Building only the objects your workflow needs, and refusing the rest.'}
                </p>
              </div>
            )
          )}

          {phase === 'error' && (
            <button onClick={() => { setPhase('intake'); setError(''); }} className="sw-btn ghost sm">Start over</button>
          )}
        </div>
      </div>

    </main>
  );
}

// Pre-upload Setup — collapsed by default so it doesn't crowd the intake. When
// the user expands and fills in any field, it surfaces a small "filled" hint
// next to the summary so they know the answers are being carried into Discover.
function SetupBlock({ setup, onChange }: { setup: SetupIntake; onChange: (s: SetupIntake) => void }) {
  const filledCount = (Object.values(setup) as string[]).filter((v) => v.trim().length > 0).length;
  return (
    <details className="sw-card" open={filledCount > 0}>
      <summary className="cursor-pointer px-4 py-3.5 flex items-center justify-between">
        <span className="sw-kicker" style={{ margin: 0 }}>
          <span className="sw-spark" aria-hidden="true" />
          Setup / a few quick details (optional)
        </span>
        <span className="sw-mono text-[10px] tracking-widest sw-muted-2">
          {filledCount > 0 ? `${filledCount} of 4 filled` : 'tap to expand'}
        </span>
      </summary>
      <div className="px-4 pb-5 pt-1 space-y-5">
        <p className="sw-muted text-xs leading-relaxed" style={{ maxWidth: '60ch' }}>
          Where does the work come from, what should we produce, and how does it connect to the
          rest of your stack? You can skip anything you&apos;re not sure about — your answers
          make the sample we show you more accurate, and they travel with the bundle when it
          hands off to the build team.
        </p>

        <SetupField
          id="setup-source"
          label="Where does your work come in from?"
          hint="The system or way the trigger arrives — email, spreadsheet, a CRM, a form."
          placeholder="e.g. Customers email us a brief. Or: weekly Excel export from Salesforce. Or: a HubSpot deal moves to ‘Proposal’."
          value={setup.source}
          onChange={(v) => onChange({ ...setup, source: v })}
        />

        <SetupField
          id="setup-output"
          label="What do you want to produce?"
          hint="The thing this workflow ends with — a document, a record in another app, a message."
          placeholder="e.g. A priced quote PDF we email back. Or: an invoice posted into QuickBooks. Or: a Slack summary to the team."
          value={setup.output}
          onChange={(v) => onChange({ ...setup, output: v })}
        />

        <SetupField
          id="setup-destination"
          label="Where should the result land?"
          hint="Where the output goes once it&apos;s approved — a person, a system, a folder."
          placeholder="e.g. Back to the customer over email. Or: into our CRM as an opportunity. Or: dropped into a shared SharePoint folder."
          value={setup.destination}
          onChange={(v) => onChange({ ...setup, destination: v })}
        />

        <SetupField
          id="setup-connection"
          label="Any specific connection details or sign-off contact?"
          hint="If there&apos;s an API, named tenant, or person who reviews — note it here. Otherwise skip."
          placeholder="e.g. Salesforce production tenant. Or: ap@finance.com reviews everything over $10K. Or: no API yet, we&apos;ll hand off manually for now."
          value={setup.connection}
          onChange={(v) => onChange({ ...setup, connection: v })}
        />
      </div>
    </details>
  );
}

function SetupField({
  id, label, hint, placeholder, value, onChange,
}: {
  id: string; label: string; hint: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm mb-1" style={{ color: 'var(--ink)' }}>{label}</label>
      <p className="sw-muted text-[11px] mb-2" style={{ maxWidth: '60ch' }}>{hint}</p>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={placeholder}
        className="sw-field w-full text-sm p-3"
      />
    </div>
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
        <button onClick={() => onSave(input, raw)} className="sw-btn ghost sm mt-2">Re-render</button>
      </div>
      <style jsx>{`
        .sw-ed {
          background: var(--paper);
          border: 1px solid var(--rule-2);
          border-radius: 2px;
          color: var(--ink);
          outline: none;
          transition: border-color 0.2s var(--sw-ease), box-shadow 0.2s var(--sw-ease);
        }
        .sw-ed:focus,
        .sw-ed:focus-visible {
          border-color: var(--signal);
          box-shadow: 0 0 0 1px var(--signal);
        }
      `}</style>
    </div>
  );
}

function OperatorDrawer({ wds }: { wds: WdsSummary }) {
  return (
    <details className="sw-card mt-4">
      <summary className="cursor-pointer px-4 py-3.5 text-[11px] tracking-widest sw-muted-2 sw-mono">Operator / Internals</summary>
      <div className="px-4 pb-4 text-xs sw-muted space-y-2">
        <div>archetype: <span style={{ color: 'var(--ink)' }}>{wds.primary_archetype}</span> / complexity: {wds.complexity} / confidence: {(wds.overall_confidence * 100).toFixed(0)}%</div>
        <div>build: <span style={{ color: 'var(--ink)' }}>{wds.required_components.join(', ')}</span></div>
        <div className="sw-muted-2">refused: {wds.unnecessary_components.join(', ') || '—'}</div>
      </div>
    </details>
  );
}
