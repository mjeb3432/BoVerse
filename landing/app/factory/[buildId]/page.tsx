'use client';

// The build bundle view. The centerpiece is the OBJECT LEDGER — all 10 BoVerse
// objects, each BUILT or REFUSED with a reason. That ledger IS the proof that
// the build path determines the objects: only what the archetype needs is built.
// Aesthetic: Editorial Paper — warm bone paper, ink type, one vermilion signal,
// hairline rules, monospaced annotations. A precise audit document, not a HUD.

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import SwarmCanvas from '@/components/swarm/swarm-canvas';
import SiteHeader from '@/components/site/site-header';

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
    (async () => {
      try {
        const r = await fetch(`/api/factory/swarm2/${buildId}`);
        // Parse defensively — an unknown/expired id can return an empty body.
        const text = await r.text();
        const d = text ? JSON.parse(text) : {};
        if (!active) return;
        if (!r.ok || d.error) {
          setError(d.message || d.error || `We couldn't find a build with this id (${r.status}).`);
          return;
        }
        setManifest(d.manifest);
        setFiles(d.files ?? []);
      } catch {
        if (active) setError("We couldn't load this build. The link may be incorrect, or the build may have expired.");
      }
    })();
    return () => { active = false; };
  }, [buildId]);

  const built = manifest?.objects.filter((o) => o.status === 'built').length ?? 0;
  const refused = manifest?.objects.filter((o) => o.status === 'refused').length ?? 0;
  const verifyPassed = manifest?.verification_status === 'passed';

  return (
    <>
      <SwarmCanvas density="calm" interactive={false} dim={0.4} />
      <SiteHeader />
      <div className="sw-content">
        <main id="main" className="sw-panel" style={{ paddingTop: 'clamp(112px, 16vh, 168px)' }}>
          <div className="sw-wrap" style={{ maxWidth: 960 }}>
            <div className="sw-kicker mb-5">BUILD / BUNDLE</div>

            <h1 className="sw-h" style={{ fontSize: 'clamp(34px, 6vw, 60px)', marginBottom: 18 }}>
              {manifest ? (manifest.workflow_name ?? 'Workflow') : error ? 'Build not found' : 'Loading your bundle'}
            </h1>

            {error && (
              <div
                role="alert"
                className="glass"
                style={{ padding: '20px 22px', marginBottom: 24, borderColor: '#c0341f', maxWidth: 540 }}
              >
                <p className="sw-muted" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{error}</p>
                <a href="/factory" className="sw-btn ghost sm">Build a workflow</a>
              </div>
            )}
            {!manifest && !error && (
              <div className="sw-mono sw-muted" style={{ fontSize: 13, letterSpacing: '0.18em', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                <span className="sw-spark" aria-hidden="true" />
                Reading the manifest…
              </div>
            )}

            {manifest && (
              <>

                <div className="flex flex-wrap items-center gap-2.5 mb-3">
                  <span className="sw-badge sw-mono" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
                    <span className="sw-mini indigo" aria-hidden="true" />
                    {manifest.primary_archetype}
                  </span>
                  <span
                    className="sw-badge sw-mono"
                    style={{
                      fontSize: 11,
                      letterSpacing: '0.16em',
                      borderColor: verifyPassed ? 'var(--signal)' : '#c0341f',
                      color: verifyPassed ? 'var(--signal-ink)' : '#c0341f',
                    }}
                  >
                    <span className="sw-mini" style={{ background: verifyPassed ? 'var(--signal)' : '#c0341f' }} aria-hidden="true" />
                    VERIFY / {manifest.verification_status.toUpperCase()}
                  </span>
                  <span className="sw-badge sw-mono sw-muted" style={{ fontSize: 11, letterSpacing: '0.16em' }}>
                    {built} BUILT / {refused} REFUSED
                  </span>
                </div>

                {manifest.build_path && (
                  <p className="sw-muted" style={{ fontSize: 15, lineHeight: 1.65, maxWidth: 720, marginBottom: 34 }}>
                    {manifest.build_path}
                  </p>
                )}

                {/* download bar */}
                <div className="flex flex-wrap gap-3 mb-12">
                  <a href={`/api/factory/swarm2/${buildId}?download=zip`} className="sw-btn sm">
                    Download bundle (.zip)
                  </a>
                  <a href={`/api/factory/swarm2/${buildId}?download=md`} className="sw-btn ghost sm">
                    Spec (.md)
                  </a>
                  <a href={`/api/factory/swarm2/${buildId}?download=json`} className="sw-btn ghost sm">
                    Manifest (.json)
                  </a>
                </div>

                {/* object ledger — the centerpiece */}
                <section className="mb-12">
                  <div className="sw-eyebrow mb-4">
                    <span className="sw-spark" aria-hidden="true" />
                    Object ledger / only what this workflow needs
                  </div>
                  <div className="glass">
                    <div
                      className="grid grid-cols-12 gap-3 sw-mono sw-muted-2"
                      style={{ padding: '14px 22px', fontSize: 10, letterSpacing: '0.22em', borderBottom: '1px solid var(--rule)' }}
                    >
                      <div className="col-span-5">OBJECT</div>
                      <div className="col-span-3">STATUS</div>
                      <div className="col-span-4">DETAIL</div>
                    </div>
                    {manifest.objects.map((o) => {
                      const isBuilt = o.status === 'built';
                      return (
                        <div
                          key={o.object_type}
                          className="sw-ledger-row grid grid-cols-12 gap-3 items-center"
                          data-status={o.status}
                          style={{
                            padding: '16px 22px',
                            borderBottom: '1px solid var(--rule)',
                            opacity: isBuilt ? 1 : 0.55,
                            transition: 'background .35s var(--sw-ease), opacity .35s var(--sw-ease), box-shadow .35s var(--sw-ease)',
                          }}
                        >
                          <div className="col-span-5">
                            <span className="sw-h" style={{ fontSize: 15, color: isBuilt ? 'var(--ink)' : 'var(--ink-dim)' }}>
                              {o.object_type}
                            </span>
                          </div>
                          <div className="col-span-3">
                            <span
                              className="sw-badge sw-mono"
                              style={{
                                fontSize: 10,
                                letterSpacing: '0.16em',
                                padding: '5px 11px',
                                borderColor: isBuilt ? 'var(--signal)' : 'var(--rule-2)',
                                color: isBuilt ? 'var(--signal-ink)' : 'var(--ink-faint)',
                                background: 'var(--paper)',
                              }}
                            >
                              <span
                                className="sw-mini"
                                style={{ width: 7, height: 7, background: isBuilt ? 'var(--signal)' : 'var(--ink-faint)' }}
                                aria-hidden="true"
                              />
                              {o.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="col-span-4 sw-muted" style={{ fontSize: 13 }}>
                            {isBuilt ? `${o.file_count} file(s)` : o.reason}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* file viewer */}
                <section>
                  <div className="sw-kicker mb-4">Files</div>
                  <div className="space-y-3">
                    {files.map((f) => (
                      <details key={f.path} className="sw-card sw-file">
                        <summary
                          className="cursor-pointer flex items-center justify-between"
                          style={{ padding: '14px 18px', listStyle: 'none' }}
                        >
                          <span className="sw-mono" style={{ fontSize: 13, color: 'var(--ink)' }}>{f.path}</span>
                          <span className="sw-mono sw-muted-2" style={{ fontSize: 10, letterSpacing: '0.14em' }}>{f.media_type}</span>
                        </summary>
                        <pre
                          className="sw-mono"
                          style={{
                            margin: '0 14px 14px',
                            padding: 16,
                            borderRadius: 3,
                            background: 'var(--paper-3)',
                            border: '1px solid var(--rule)',
                            whiteSpace: 'pre-wrap',
                            fontSize: 12,
                            lineHeight: 1.6,
                            color: 'var(--ink)',
                            overflowX: 'auto',
                          }}
                        >{f.content}</pre>
                      </details>
                    ))}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
