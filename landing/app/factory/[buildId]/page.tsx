'use client';

// The build bundle view. The centerpiece is the OBJECT LEDGER — all 10 BoVerse
// objects, each BUILT or REFUSED with a reason. That ledger IS the proof that
// the build path determines the objects: only what the archetype needs is built.
// Honors DESIGN.md (mono / black / ASCII / semantic badges).

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface ManifestObject { object_type: string; status: 'built' | 'refused'; reason: string | null; file_count: number }
interface Manifest {
  workflow_name: string | null;
  primary_archetype: string;
  build_path: string | null;
  build_readiness: string;
  verification_status: string;
  generated_at: string;
  objects: ManifestObject[];
  warnings: string[];
}
interface BundleFile { path: string; media_type: string; content: string }

export default function BundlePage() {
  const params = useParams();
  const buildId = Array.isArray(params.buildId) ? params.buildId[0] : (params.buildId as string);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [files, setFiles] = useState<BundleFile[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch(`/api/factory/swarm2/${buildId}`)
      .then((r) => r.json())
      .then((d) => { if (!active) return; if (d.error) setError(d.message || d.error); else { setManifest(d.manifest); setFiles(d.files ?? []); } })
      .catch((e) => active && setError(String(e)));
    return () => { active = false; };
  }, [buildId]);

  const built = manifest?.objects.filter((o) => o.status === 'built').length ?? 0;
  const refused = manifest?.objects.filter((o) => o.status === 'refused').length ?? 0;

  return (
    <main className="min-h-screen bg-black text-white font-mono">
      <div className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-5xl">
        <div className="flex items-center gap-2 mb-6 opacity-60">
          <div className="w-8 h-px bg-white" />
          <span className="text-[10px] tracking-widest">BUILD · BUNDLE</span>
          <div className="flex-1 h-px bg-white" />
        </div>

        {error && <div role="alert" className="border border-orange-400/60 text-orange-400/90 text-xs p-3 mb-6">{error}</div>}
        {!manifest && !error && <div className="text-[11px] tracking-widest text-yellow-400">◐ Loading bundle…</div>}

        {manifest && (
          <>
            <h1 className="text-2xl lg:text-4xl font-bold tracking-wider mb-3">{(manifest.workflow_name ?? 'WORKFLOW').toUpperCase()}</h1>
            <div className="flex flex-wrap items-center gap-2 mb-2 text-[9px] tracking-widest">
              <span className="px-2 py-0.5 border border-white text-white">{manifest.primary_archetype}</span>
              <span className={`px-2 py-0.5 border ${manifest.verification_status === 'passed' ? 'border-white text-white' : 'border-orange-400 text-orange-400'}`}>VERIFY · {manifest.verification_status.toUpperCase()}</span>
              <span className="px-2 py-0.5 border border-white/40 text-white/60">{built} BUILT · {refused} REFUSED</span>
            </div>
            {manifest.build_path && <p className="text-xs text-white/60 leading-relaxed max-w-3xl mb-8">{manifest.build_path}</p>}

            {/* download bar */}
            <div className="flex flex-wrap gap-3 mb-10">
              <a href={`/api/factory/swarm2/${buildId}?download=zip`} className="px-6 py-2.5 bg-white text-black text-xs tracking-widest border border-white hover:bg-transparent hover:text-white transition-all">DOWNLOAD BUNDLE (.zip) ↓</a>
              <a href={`/api/factory/swarm2/${buildId}?download=md`} className="px-5 py-2.5 border border-white text-xs tracking-widest hover:bg-white hover:text-black transition-colors">SPEC (.md) ↓</a>
              <a href={`/api/factory/swarm2/${buildId}?download=json`} className="px-5 py-2.5 border border-white text-xs tracking-widest hover:bg-white hover:text-black transition-colors">MANIFEST (.json) ↓</a>
            </div>

            {/* object ledger */}
            <section className="mb-10">
              <div className="text-[10px] tracking-widest text-white/40 mb-3">OBJECT LEDGER · ONLY WHAT THIS WORKFLOW NEEDS</div>
              <div className="border border-white/20">
                <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-white/10 text-[10px] text-white/40 tracking-widest bg-white/[0.02]">
                  <div className="col-span-4">OBJECT</div>
                  <div className="col-span-2">STATUS</div>
                  <div className="col-span-6">DETAIL</div>
                </div>
                {manifest.objects.map((o) => (
                  <div key={o.object_type} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors items-center text-xs">
                    <div className="col-span-4 text-white/80">{o.object_type}</div>
                    <div className="col-span-2">
                      <span className={`text-[9px] tracking-widest px-2 py-0.5 border ${o.status === 'built' ? 'border-white text-white' : 'border-orange-400 text-orange-400'}`}>{o.status.toUpperCase()}</span>
                    </div>
                    <div className="col-span-6 text-white/50">{o.status === 'built' ? `${o.file_count} file(s)` : o.reason}</div>
                  </div>
                ))}
              </div>
            </section>

            {/* file viewer */}
            <section>
              <div className="text-[10px] tracking-widest text-white/40 mb-3">FILES</div>
              <div className="space-y-2">
                {files.map((f) => (
                  <details key={f.path} className="border border-white/20">
                    <summary className="cursor-pointer px-4 py-2.5 text-xs text-white/80 flex items-center justify-between">
                      <span>{f.path}</span>
                      <span className="text-[9px] tracking-widest text-white/30">{f.media_type}</span>
                    </summary>
                    <pre className="px-4 pb-4 whitespace-pre-wrap text-[11px] text-white/60 overflow-x-auto">{f.content}</pre>
                  </details>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
