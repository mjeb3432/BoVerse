// Browse historical workflow_sessions from Supabase. Lists every session
// with a one-line summary; click through to /sessions/[id] for full detail
// and download links.

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/site/site-header';
import SiteFooter from '@/components/site/site-footer';

interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
  current_stage: string;
  workflow_name: string | null;
  files_count: number;
  schema_count: number;
  rows_count: number;
  steps_count: number;
  rag_count: number;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sessions')
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          setError(err.message ?? `HTTP ${r.status}`);
          return;
        }
        const data = (await r.json()) as { sessions: SessionRow[] };
        setSessions(data.sessions);
      })
      .catch((e) => setError((e as Error).message));
  }, []);

  const stageColor = (stage: string) => {
    if (stage === 'complete') return 'text-green-300/90 border-green-300/40';
    if (stage === 'deliver') return 'text-orange-300/90 border-orange-300/40';
    if (stage === 'generate' || stage === 'simulate') return 'text-yellow-300/90 border-yellow-300/40';
    return 'text-white/50 border-white/20';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />
      <main id="main" className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-6xl">
        <div className="flex items-center gap-2 mb-6 opacity-60">
          <div className="w-8 h-px bg-white"></div>
          <span className="text-white text-[10px] font-mono tracking-wider">SESSIONS · HISTORICAL</span>
          <div className="flex-1 h-px bg-white"></div>
        </div>

        <h1 className="text-3xl lg:text-5xl font-bold font-mono tracking-wider leading-[1.05] mb-4" style={{ letterSpacing: '0.06em' }}>
          EVERY RUN.
          <span className="block opacity-80 mt-1 lg:mt-2">EVERY OUTPUT.</span>
        </h1>
        <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed max-w-3xl mb-10">
          Every workflow session lives in Supabase Postgres. Click any row to see the full data — inferred process, clarification Q&A, schema, synthetic rows, generated workflow, RAG library, execution trace — and download the agent-swarm prompt to drop into Claude / GPT / your own multi-agent runtime.
        </p>

        {error && (
          <div className="border border-yellow-400/40 bg-yellow-400/5 px-4 py-3 font-mono text-xs text-yellow-200 mb-8">
            <div className="text-[10px] tracking-widest text-yellow-400 mb-1">NOTE</div>
            {error}
          </div>
        )}

        {sessions === null && !error && (
          <div className="font-mono text-xs text-white/40 tracking-widest animate-pulse">LOADING…</div>
        )}

        {sessions && sessions.length === 0 && (
          <div className="border border-white/10 p-8 font-mono text-sm text-white/60">
            No sessions yet. Head to{' '}
            <Link href="/factory" className="text-white underline hover:no-underline">/factory</Link>{' '}
            to create your first one.
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <ul className="divide-y divide-white/10 border border-white/10">
            {sessions.map((s) => {
              const ts = new Date(s.created_at);
              const tsLabel = ts.toISOString().slice(0, 16).replace('T', ' ');
              const counts = [
                s.files_count && `${s.files_count} file${s.files_count === 1 ? '' : 's'}`,
                s.schema_count && `${s.schema_count} schema`,
                s.rows_count && `${s.rows_count} rows`,
                s.steps_count && `${s.steps_count} steps`,
                s.rag_count && `${s.rag_count} RAG`,
              ].filter(Boolean).join(' · ');
              return (
                <li key={s.id}>
                  <Link href={`/sessions/${s.id}`} className="block px-4 lg:px-6 py-4 hover:bg-white/[0.03] transition-colors">
                    <div className="flex items-center gap-3 lg:gap-4 flex-wrap">
                      <span className="font-mono text-[10px] lg:text-[11px] text-white/40 w-20 lg:w-24 shrink-0">
                        {s.id.slice(0, 8)}
                      </span>
                      <span className="font-mono text-[10px] lg:text-[11px] text-white/50 w-32 lg:w-36 shrink-0">
                        {tsLabel}
                      </span>
                      <span className={`font-mono text-[9px] lg:text-[10px] tracking-widest px-2 py-0.5 border ${stageColor(s.current_stage)} shrink-0`}>
                        {s.current_stage.toUpperCase()}
                      </span>
                      <span className="font-mono text-xs lg:text-sm text-white/90 flex-1 min-w-0 truncate">
                        {s.workflow_name ?? '(no workflow yet)'}
                      </span>
                      <span className="font-mono text-[10px] lg:text-[11px] text-white/40 shrink-0">
                        {counts || '—'}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
