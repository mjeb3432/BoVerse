// /sessions/[id] — full detail view for one historical workflow session.
// Loads the row from /api/sessions/[id] and renders:
//   - Stage 01 inferred process
//   - Stage 02 Q&A
//   - Stage 03 schema + synthetic rows (collapsible)
//   - Stage 04 workflow definition (collapsible)
//   - RAG library + graph edges
//   - Input artifacts (with extracted text)
//   - Download buttons (JSON full dump + agent-swarm markdown)

'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site/site-header';
import SiteFooter from '@/components/site/site-footer';
import type { GenerateOutput, IngestOutput, SimulateOutput, ClarifyOutput, ClarifyAnswers } from '@/lib/workflow-types';

interface SessionDetail {
  id: string;
  created_at: string;
  current_stage: string;
  uploaded_files: Array<{ name: string; mime_type: string; size_bytes: number }> | null;
  ingest_output: IngestOutput | null;
  clarify_output: ClarifyOutput | null;
  clarify_answers: ClarifyAnswers | null;
  simulate_output: SimulateOutput | null;
  generate_output: GenerateOutput | null;
  artifacts: Array<{ id: string; file_name: string; mime_type: string; size_bytes: number; extracted_text: string | null; was_multimodal: boolean }>;
  rag_assets: Array<{ id: string; asset_name: string; asset_type: string; description: string; content: string; has_embedding: boolean }>;
  rag_edges: Array<{ source_asset_id: string; target_asset_id: string; edge_type: string; weight: number; metadata: Record<string, unknown> }>;
}

export default function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          setError(err.message ?? `HTTP ${r.status}`);
          return;
        }
        setData((await r.json()) as SessionDetail);
      })
      .catch((e) => setError((e as Error).message));
  }, [id]);

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SiteHeader />
        <main className="container mx-auto px-6 lg:px-16 py-16 max-w-6xl">
          <div className="border border-yellow-400/40 bg-yellow-400/5 px-4 py-3 font-mono text-sm text-yellow-200">
            {error}
          </div>
          <Link href="/sessions" className="inline-block mt-6 text-xs font-mono text-white/60 hover:text-white tracking-widest underline">
            ← BACK TO SESSIONS
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-black text-white">
        <SiteHeader />
        <main className="container mx-auto px-6 lg:px-16 py-16 max-w-6xl">
          <div className="font-mono text-xs text-white/40 tracking-widest animate-pulse">LOADING…</div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const ts = new Date(data.created_at).toISOString().slice(0, 16).replace('T', ' ');
  const swarmAvailable = !!(data.generate_output && data.simulate_output);

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <main className="container mx-auto px-6 lg:px-16 py-16 max-w-6xl space-y-10">
        <div>
          <Link href="/sessions" className="text-xs font-mono text-white/60 hover:text-white tracking-widest underline mb-6 inline-block">
            ← BACK TO SESSIONS
          </Link>
          <h1 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider leading-tight">
            {data.generate_output?.workflow_name ?? `Session ${data.id.slice(0, 8)}`}
          </h1>
          <div className="mt-2 text-[11px] font-mono text-white/50 tracking-wider">
            {data.id} · {ts} · stage=<span className="text-white/80">{data.current_stage}</span>
          </div>
        </div>

        {/* Downloads */}
        <div className="flex flex-wrap gap-3">
          {swarmAvailable && (
            <a
              href={`/api/sessions/${data.id}?download=md`}
              className="px-5 py-3 border-2 border-orange-300/60 text-orange-200 font-mono text-xs tracking-widest hover:bg-orange-300/10 hover:border-orange-300 transition-all"
            >
              AGENT SWARM PROMPT (.md)
            </a>
          )}
          <a
            href={`/api/sessions/${data.id}?download=json`}
            className="px-5 py-3 border border-white/30 text-white font-mono text-xs tracking-widest hover:border-white transition-all"
          >
            FULL DUMP (.json)
          </a>
        </div>

        {/* Stage 01 */}
        {data.ingest_output && (
          <DetailSection n="01" label="INGEST · inferred process">
            <div className="font-mono text-xs lg:text-sm space-y-3">
              <div><span className="text-white/40 tracking-widest text-[10px]">BUSINESS</span> · {data.ingest_output.inferred_business_type}</div>
              <div><span className="text-white/40 tracking-widest text-[10px]">PROCESS</span> · {data.ingest_output.inferred_process_name}</div>
              <div><span className="text-white/40 tracking-widest text-[10px]">GOAL</span> · {data.ingest_output.inferred_output_goal}</div>
              <div className="text-white/70 leading-relaxed">{data.ingest_output.summary}</div>
            </div>
          </DetailSection>
        )}

        {/* Stage 02 */}
        {data.clarify_output && (
          <DetailSection n="02" label={`CLARIFY · ${data.clarify_output.questions.length} questions`}>
            <ul className="space-y-3 font-mono text-xs lg:text-sm">
              {data.clarify_output.questions.map((q, i) => {
                const ans = data.clarify_answers?.answers.find((a) => a.id === q.id)?.answer;
                return (
                  <li key={q.id} className="border-l-2 border-white/20 pl-3">
                    <div className="text-white/90 mb-1">Q{i + 1}. {q.question}</div>
                    {ans && <div className="text-white/70 mt-1"><span className="text-[10px] text-white/40 tracking-widest">A →</span> {ans}</div>}
                  </li>
                );
              })}
            </ul>
          </DetailSection>
        )}

        {/* Stage 03 */}
        {data.simulate_output && (
          <DetailSection n="03" label={`SIMULATE · ${data.simulate_output.schema.length} fields, ${data.simulate_output.rows.length} rows`}>
            <details className="font-mono text-xs space-y-3">
              <summary className="cursor-pointer text-white/60 hover:text-white">View synthetic dataset</summary>
              <div className="mt-3 space-y-3">
                {data.simulate_output.rows.map((row) => (
                  <div key={row.row_id} className={`border ${row.kind === 'edge' ? 'border-orange-400/40' : 'border-white/10'} p-3`}>
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-white/40">{row.row_id}</span>
                      <span className={`text-[9px] tracking-widest px-1.5 py-0.5 border ${row.kind === 'edge' ? 'border-orange-400/40 text-orange-300/80' : 'border-white/20 text-white/60'}`}>{row.kind.toUpperCase()}</span>
                      {row.edge_case_description && <span className="text-orange-200/80 text-[11px]">{row.edge_case_description}</span>}
                    </div>
                    <pre className="text-[10px] text-white/70 overflow-x-auto">{JSON.stringify(row.data, null, 2)}</pre>
                  </div>
                ))}
              </div>
            </details>
          </DetailSection>
        )}

        {/* Stage 04 */}
        {data.generate_output && (
          <DetailSection n="04" label={`GENERATE · ${data.generate_output.steps.length} steps, ${data.generate_output.rag_library.length} RAG`}>
            <p className="font-mono text-xs lg:text-sm text-white/70 mb-4">{data.generate_output.workflow_description}</p>
            <details className="font-mono text-xs">
              <summary className="cursor-pointer text-white/60 hover:text-white">View all steps</summary>
              <ul className="mt-3 space-y-2">
                {data.generate_output.steps.map((step) => (
                  <li key={step.id} className="border-l-2 border-white/20 pl-3 py-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-white/40">{step.id}</span>
                      <span className="text-white">{step.name}</span>
                      <span className="text-[9px] text-white/50 border border-white/20 px-1">{step.primitive}</span>
                      <span className="text-[9px] text-white/50 border border-white/20 px-1">{step.actor}</span>
                    </div>
                    <div className="text-[10px] text-white/50 mt-1">{step.rationale}</div>
                  </li>
                ))}
              </ul>
            </details>
          </DetailSection>
        )}

        {/* RAG */}
        {data.rag_assets.length > 0 && (
          <DetailSection n="RG" label={`RAG · ${data.rag_assets.length} assets, ${data.rag_edges.length} edges`}>
            <ul className="font-mono text-xs space-y-2">
              {data.rag_assets.map((a) => (
                <li key={a.id} className="border-l-2 border-white/20 pl-3">
                  <span className="text-white">{a.asset_name}</span>
                  <span className="text-white/40 ml-2">({a.asset_type}{a.has_embedding ? ', embedded' : ''})</span>
                  <div className="text-white/60 mt-0.5">{a.description}</div>
                </li>
              ))}
            </ul>
            {data.rag_edges.length > 0 && (
              <details className="mt-3 font-mono text-[11px]">
                <summary className="cursor-pointer text-white/60 hover:text-white">View graph edges</summary>
                <ul className="mt-2 space-y-1 text-white/60">
                  {data.rag_edges.map((e, i) => (
                    <li key={i}>{e.edge_type} · weight={e.weight.toFixed(2)} · {e.source_asset_id.slice(0, 8)} → {e.target_asset_id.slice(0, 8)}</li>
                  ))}
                </ul>
              </details>
            )}
          </DetailSection>
        )}

        {/* Artifacts */}
        {data.artifacts.length > 0 && (
          <DetailSection n="IN" label={`INPUT FILES · ${data.artifacts.length}`}>
            <ul className="font-mono text-xs space-y-3">
              {data.artifacts.map((a) => (
                <li key={a.id} className="border border-white/10 p-3">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-white">{a.file_name}</span>
                    <span className="text-white/40">{a.mime_type}</span>
                    <span className="text-white/40">{(a.size_bytes / 1024).toFixed(1)}KB</span>
                    {a.was_multimodal && <span className="text-[9px] text-orange-200/80 border border-orange-300/40 px-1">multimodal</span>}
                  </div>
                  {a.extracted_text && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-white/60 hover:text-white text-[11px]">View extracted text ({a.extracted_text.length}ch)</summary>
                      <pre className="mt-2 text-[10px] text-white/70 overflow-x-auto whitespace-pre-wrap">{a.extracted_text}</pre>
                    </details>
                  )}
                </li>
              ))}
            </ul>
          </DetailSection>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function DetailSection({ n, label, children }: { n: string; label: string; children: React.ReactNode }) {
  return (
    <section className="border border-white/10">
      <div className="px-4 lg:px-6 py-3 border-b border-white/10 bg-white/[0.02]">
        <span className="font-mono text-[10px] tracking-widest text-white/80">{n} · {label}</span>
      </div>
      <div className="p-4 lg:p-6">{children}</div>
    </section>
  );
}
