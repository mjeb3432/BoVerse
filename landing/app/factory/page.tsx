'use client';

// The BoVerse factory — the business-user surface. The user describes an
// outcome, uploads evidence, answers a few questions, then reviews ONLY two
// things: a sample OUTPUT and a sample-INPUTS pack. They comment / edit inputs
// and approve. All machinery (canonical store, archetype, rules) is hidden
// behind the OPERATOR drawer. Honors DESIGN.md (mono / black / ASCII / badges).

import { useCallback, useMemo, useRef, useState } from 'react';

type Phase = 'intake' | 'discovering' | 'questions' | 'review' | 'approved' | 'error';

interface Question { gap_id: string; suggested_question: string | null; severity: string; missing_attribute?: string | null }
interface SampleInput { input_name: string; input_type: string; format: string; rendered: string; example_value: unknown }
interface SampleOutput { output_name: string; output_type: string; output_format: string; required_sections: string[]; rendered_sample: string; computed_fields: Record<string, unknown> }
interface WdsSummary { primary_archetype: string; complexity: string; overall_confidence: number; required_components: string[]; unnecessary_components: string[] }

const SEV_COLOR: Record<string, string> = {
  critical: 'border-orange-400 text-orange-400',
  high: 'border-orange-400 text-orange-400',
  medium: 'border-yellow-400 text-yellow-400',
  low: 'border-white/40 text-white/60',
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
    setPhase('approved');
  }

  const computed = useMemo(() => Object.entries(sampleOutput?.computed_fields ?? {}), [sampleOutput]);

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <div className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-5xl">
        <div className="flex items-center gap-2 mb-6 opacity-60">
          <div className="w-8 h-px bg-white" />
          <span className="text-[10px] tracking-widest">FACTORY · 001</span>
          <div className="flex-1 h-px bg-white" />
        </div>
        <h1 className="text-3xl lg:text-5xl font-bold tracking-wider mb-4">DESCRIBE. UPLOAD. APPROVE.</h1>
        <p className="text-sm lg:text-base text-white/70 leading-relaxed max-w-2xl mb-10">
          Tell us the outcome you want and drop in whatever you already have. BoVerse infers the workflow and shows you a sample result and the inputs that produce it. Comment, tweak, approve — we build it.
        </p>

        {/* progress / status line */}
        {status && phase !== 'error' && (
          <div className="text-[11px] tracking-widest text-yellow-400 mb-6">◐ {status}</div>
        )}
        {error && (
          <div role="alert" className="border border-orange-400/60 text-orange-400/90 text-xs p-3 mb-6">{error}</div>
        )}

        {/* ── INTAKE ── */}
        {phase === 'intake' && (
          <div className="space-y-6">
            <div>
              <label htmlFor="outcome" className="block text-[10px] tracking-widest text-white/40 mb-2">OUTCOME · WHAT DO YOU WANT?</label>
              <textarea id="outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={3}
                placeholder="e.g. Turn an inbound brief into a priced proposal in minutes."
                className="w-full bg-transparent border border-white/30 focus:border-white focus-visible:ring-1 focus-visible:ring-white outline-none p-3 text-sm placeholder:text-white/30" />
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              className={`border border-dashed p-8 text-center transition-colors ${dragging ? 'border-white bg-white/[0.04]' : 'border-white/30'}`}
            >
              <div className="text-[10px] tracking-widest text-white/40 mb-2">EVIDENCE · DROP FILES</div>
              <p className="text-xs text-white/60 mb-3">Notes, SOPs, spreadsheets, sample outputs, exports, screenshots.</p>
              <button onClick={() => fileRef.current?.click()} className="px-5 py-2 border border-white text-xs tracking-widest hover:bg-white hover:text-black transition-colors">BROWSE</button>
              <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            </div>
            {files.length > 0 && (
              <ul className="border border-white/20 divide-y divide-white/5">
                {files.map((f, i) => (
                  <li key={f.name + i} className="flex items-center justify-between px-4 py-2 text-xs">
                    <span className="text-white/70">{f.name}</span>
                    <button aria-label={`remove ${f.name}`} onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="text-white/40 hover:text-orange-400">×</button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={discover} className="px-8 py-3 bg-white text-black text-sm tracking-widest border border-white hover:bg-transparent hover:text-white transition-all">DISCOVER →</button>
          </div>
        )}

        {/* ── QUESTIONS ── */}
        {phase === 'questions' && (
          <div className="space-y-6">
            <div className="text-[10px] tracking-widest text-white/40">A FEW THINGS WE COULDN&apos;T INFER</div>
            {questions.map((q) => (
              <div key={q.gap_id} className="border border-white/20 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[9px] tracking-widest px-2 py-0.5 border ${SEV_COLOR[q.severity] ?? SEV_COLOR.low}`}>{q.severity.toUpperCase()}</span>
                </div>
                <p className="text-sm text-white/80 mb-3">{q.suggested_question}</p>
                <input value={answers[q.gap_id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [q.gap_id]: e.target.value }))}
                  className="w-full bg-transparent border border-white/30 focus:border-white outline-none p-2 text-sm" />
              </div>
            ))}
            <button onClick={submitAnswers} className="px-8 py-3 bg-white text-black text-sm tracking-widest border border-white hover:bg-transparent hover:text-white transition-all">SUBMIT →</button>
          </div>
        )}

        {/* ── REVIEW (the two surfaces) ── */}
        {phase === 'review' && sampleOutput && (
          <div className="space-y-10">
            <section>
              <div className="text-[10px] tracking-widest text-white/40 mb-3">SAMPLE OUTPUT · {sampleOutput.output_name.toUpperCase()}</div>
              <div className="border border-white/20 p-5 bg-white/[0.02]">
                <pre className="whitespace-pre-wrap text-xs lg:text-sm text-white/80 leading-relaxed font-mono">{sampleOutput.rendered_sample}</pre>
              </div>
              {computed.length > 0 && (
                <div className="border border-white/20 mt-3">
                  {computed.map(([k, v]) => (
                    <div key={k} className="grid grid-cols-2 gap-3 px-4 py-2 border-b border-white/5 last:border-b-0 text-xs">
                      <span className="text-white/40">{k}</span>
                      <span className="text-white/80 text-right">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="text-[10px] tracking-widest text-white/40 mb-3">SAMPLE INPUTS · EDIT ANY VALUE TO RE-RENDER</div>
              <div className="space-y-3">
                {sampleInputs.map((si) => (
                  <details key={si.input_name} className="border border-white/20">
                    <summary className="cursor-pointer px-4 py-3 text-sm text-white/80 flex items-center justify-between">
                      <span>{si.input_name}</span>
                      <span className="text-[9px] tracking-widest text-white/30">{si.input_type} · {si.format}</span>
                    </summary>
                    <div className="px-4 pb-4">
                      <pre className="whitespace-pre-wrap text-[11px] text-white/60 mb-3">{si.rendered}</pre>
                      <InputEditor input={si} onSave={editInput} />
                    </div>
                  </details>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="text-[10px] tracking-widest text-white/40">COMMENT</div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2}
                placeholder="Anything look off? e.g. &quot;the rush fee looks too low&quot;"
                className="w-full bg-transparent border border-white/30 focus:border-white outline-none p-3 text-sm placeholder:text-white/30" />
              <button onClick={() => sendComment('output')} className="px-5 py-2 border border-white text-xs tracking-widest hover:bg-white hover:text-black transition-colors">COMMENT →</button>
            </section>

            <div className="flex items-center gap-4">
              <button onClick={approve} className="px-8 py-3 bg-white text-black text-sm tracking-widest border border-white hover:bg-transparent hover:text-white transition-all">APPROVE →</button>
              <span className="text-[10px] tracking-widest text-white/30">Approval releases the build.</span>
            </div>

            {wds && <OperatorDrawer wds={wds} />}
          </div>
        )}

        {/* ── APPROVED ── */}
        {phase === 'approved' && (
          <div className="space-y-6">
            <div className="border border-white/30 p-6">
              <div className="text-[10px] tracking-widest text-white mb-2">APPROVED</div>
              <p className="text-sm text-white/70">The specification is approved and the Build swarm is released. The build view appears here once Swarm 2 is wired.</p>
            </div>
            {wds && <OperatorDrawer wds={wds} />}
          </div>
        )}

        {phase === 'error' && (
          <button onClick={() => { setPhase('intake'); setError(''); }} className="px-6 py-2 border border-white text-xs tracking-widest hover:bg-white hover:text-black transition-colors">← START OVER</button>
        )}
      </div>
    </main>
  );
}

function InputEditor({ input, onSave }: { input: SampleInput; onSave: (i: SampleInput, raw: string) => void }) {
  const initial = typeof input.example_value === 'string' ? input.example_value : JSON.stringify(input.example_value, null, 2);
  const [raw, setRaw] = useState(initial);
  return (
    <div>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={5}
        className="w-full bg-transparent border border-white/20 focus:border-white outline-none p-2 text-[11px] font-mono" />
      <button onClick={() => onSave(input, raw)} className="mt-2 px-4 py-1.5 border border-white text-[10px] tracking-widest hover:bg-white hover:text-black transition-colors">RE-RENDER →</button>
    </div>
  );
}

function OperatorDrawer({ wds }: { wds: WdsSummary }) {
  return (
    <details className="border border-white/10 mt-4">
      <summary className="cursor-pointer px-4 py-3 text-[10px] tracking-widest text-white/40">OPERATOR · INTERNALS</summary>
      <div className="px-4 pb-4 text-xs text-white/60 space-y-2">
        <div>archetype: <span className="text-white/80">{wds.primary_archetype}</span> · complexity: {wds.complexity} · confidence: {(wds.overall_confidence * 100).toFixed(0)}%</div>
        <div>build: <span className="text-white/80">{wds.required_components.join(', ')}</span></div>
        <div className="text-white/30">refused: {wds.unnecessary_components.join(', ') || '—'}</div>
      </div>
    </details>
  );
}
