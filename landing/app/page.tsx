'use client';

// BoVerse home — editorial paper. A boids canvas (ink on paper) self-assembles
// into the two-swarm pipeline while a build diagram fades in. Scroll past the
// hero (or press "Watch it build") to trigger it; scroll on to dissolve.
//
// The page only orchestrates state (assembled / dim) + the scroll listener; all
// visuals come from the editorial system in globals.css (SwarmCanvas, Reveal,
// SiteHeader, SiteFooter, sw- classes). Convention: Discovery = ink, Build =
// vermilion signal. The root layout supplies <body className="sw"> + metadata.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import SwarmCanvas from '@/components/swarm/swarm-canvas';
import Reveal from '@/components/swarm/reveal';
import SiteHeader from '@/components/site/site-header';
import SiteFooter from '@/components/site/site-footer';

// Monospace label (eyebrows, captions, annotations).
const LABEL = {
  fontFamily: 'var(--font-geist-mono), monospace',
  fontSize: 10.5,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  fontWeight: 500,
  color: 'var(--ink-dim)',
} as const;

const HUD_H4 = { fontSize: 'clamp(16px, 2.4vw, 20px)', marginBottom: 6, color: 'var(--ink)' } as const;
const HUD_P = { fontSize: 12.5, color: 'var(--ink-dim)', margin: 0, lineHeight: 1.5 } as const;

export default function Page() {
  const [assembled, setAssembled] = useState(false);
  const [dim, setDim] = useState(1);

  // Refs so the single scroll listener never re-binds and the button's manual
  // override can briefly lock out scroll without stale closures.
  const heroRef = useRef<HTMLElement>(null);
  const assembledRef = useRef(false);
  const manualLockRef = useRef(false);
  const lockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    assembledRef.current = assembled;
  }, [assembled]);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Reduced motion: skip the scroll-jacking entirely. SwarmCanvas paints a
    // calm static frame on its own; keep the backdrop at full opacity.
    if (reduceMotion) return;

    const onScroll = () => {
      if (manualLockRef.current) return;
      const hero = heroRef.current;
      const y = window.scrollY;
      const vh = window.innerHeight;
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : vh - y;
      const heroVisible = Math.max(0, Math.min(1, heroBottom / vh));
      const wantAssembled = y > vh * 0.12 && heroVisible > 0.55;
      if (wantAssembled !== assembledRef.current) setAssembled(wantAssembled);
      setDim(0.32 + 0.68 * heroVisible);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // "Watch it build" — manual toggle with a short lock so a scroll event
  // doesn't immediately override the user's intent.
  const toggleWatch = () => {
    manualLockRef.current = true;
    setAssembled((prev) => {
      const next = !prev;
      setDim(next ? 1 : 0.32 + 0.68);
      return next;
    });
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => {
      manualLockRef.current = false;
    }, 1200);
  };

  useEffect(() => () => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
  }, []);

  return (
    <>
      <SwarmCanvas assembled={assembled} dim={dim} />
      <SiteHeader />

      {/* Live build diagram — fades in while the swarm assembles into the pipeline */}
      <div className={`sw-hud${assembled ? ' show' : ''}`} aria-hidden="true">
        <div className="sw-hud-grid">
          <div className="sw-hud-card c1">
            <div style={{ ...LABEL, marginBottom: 8 }}>Swarm 01 / Discovery</div>
            <h4 className="sw-h" style={HUD_H4}>Infers the workflow</h4>
            <p style={HUD_P}>Reads your evidence and shows a sample to approve.</p>
          </div>
          <div className="sw-hud-gate">
            <div className="sw-ring"><span /></div>
            <div style={{ ...LABEL, letterSpacing: '0.26em', color: 'var(--ink)' }}>Approve</div>
          </div>
          <div className="sw-hud-card c2">
            <div style={{ ...LABEL, marginBottom: 8, color: 'var(--signal-ink)' }}>Swarm 02 / Build</div>
            <h4 className="sw-h" style={HUD_H4}>Assembles the parts</h4>
            <p style={HUD_P}>Only the pieces your workflow actually needs.</p>
          </div>
        </div>
      </div>

      <div className={`sw-content${assembled ? ' sw-assembling' : ''}`}>
        <main id="main">
          {/* ── HERO ── */}
          <section ref={heroRef} className="sw-hero" aria-labelledby="hero-title">
            <div className="sw-hero-glass">
              {/* masthead rule */}
              <div className="sw-masthead">
                <span style={LABEL}>The workflow factory</span>
                <span style={{ ...LABEL, color: 'var(--ink-faint)' }}>Fig. 001</span>
              </div>
              <span className="sw-eyebrow" style={{ marginBottom: 22 }}>
                <span className="sw-spark" aria-hidden="true" />
                Two swarms, one outcome
              </span>
              <h1 id="hero-title" className="sw-h">
                Describe it.<br />We build it.
              </h1>
              <div className="sw-hero-grid">
                <p className="sw-subhead">
                  Tell BoVerse the outcome you want and upload whatever you already have. Two
                  AI swarms infer the workflow and build it. You only review and approve.
                </p>
                <div className="sw-cta-row">
                  <Link className="sw-btn" href="/factory">Build a workflow</Link>
                  <button type="button" id="watch" className="sw-btn ghost" aria-pressed={assembled} onClick={toggleWatch}>
                    {assembled ? 'Stop' : 'Watch it build'}
                  </button>
                </div>
              </div>
            </div>
            <div className="sw-scrollcue" aria-hidden="true">
              <span className="sw-mouse" />
              Scroll
            </div>
          </section>

          {/* ── WHY ── */}
          <section className="sw-panel sw-slab" aria-labelledby="why-title">
            <div className="sw-wrap">
              <Reveal>
                <span className="sw-kicker">01 / Why BoVerse</span>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 id="why-title" className="sw-h" style={{ fontSize: 'clamp(30px, 5.4vw, 60px)', maxWidth: '15ch', margin: '20px 0 28px' }}>
                  Your business runs on one person&apos;s instinct.
                </h2>
              </Reveal>
              <Reveal delay={0.12}>
                <p className="sw-muted" style={{ fontSize: 'clamp(16px, 2.2vw, 21px)', maxWidth: '58ch', lineHeight: 1.65 }}>
                  The person who has priced your jobs for fifteen years carries the whole logic in
                  their head. It isn&apos;t written down, it doesn&apos;t survive a resignation, and it
                  never gets applied the same way twice.{' '}
                  <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>
                    BoVerse turns that know-how into a workflow you can actually run.
                  </strong>
                </p>
              </Reveal>
            </div>
          </section>

          {/* ── HOW ── */}
          <section className="sw-panel" id="how" aria-labelledby="how-title">
            <div className="sw-wrap">
              <Reveal>
                <span className="sw-kicker">02 / How it works</span>
              </Reveal>
              <Reveal delay={0.06}>
                <h2 id="how-title" className="sw-h" style={{ fontSize: 'clamp(28px, 5vw, 52px)', maxWidth: '18ch', margin: '20px 0 0' }}>
                  Three steps. You stay in control of every one.
                </h2>
              </Reveal>
              <div
                className="sw-how-grid"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(var(--how-cols, 3), 1fr)', gap: 1, marginTop: 52, background: 'var(--rule-2)', border: '1px solid var(--rule-2)' }}
              >
                {STEPS.map((s, i) => (
                  <Reveal key={s.num} delay={0.06 * (i + 1)}>
                    <article className="sw-step" style={{ height: '100%', border: 0, borderRadius: 0 }}>
                      <div className="sw-step-index" aria-hidden="true">{s.num}</div>
                      <h3 className="sw-h" style={{ fontSize: 22, margin: '0 0 10px' }}>{s.title}</h3>
                      <p className="sw-muted" style={{ fontSize: 14.5, margin: 0, lineHeight: 1.6 }}>{s.body}</p>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>

          {/* ── TWO SWARMS ── */}
          <section className="sw-panel sw-slab" aria-labelledby="swarms-title">
            <div className="sw-wrap">
              <Reveal>
                <span className="sw-kicker">03 / Under the hood</span>
              </Reveal>
              <Reveal delay={0.06}>
                <p id="swarms-title" className="sw-h" style={{ fontSize: 'clamp(20px, 3vw, 30px)', color: 'var(--ink)', maxWidth: '28ch', margin: '20px 0 48px', lineHeight: 1.25, fontWeight: 600 }}>
                  Behind those three steps, two swarms of agents do the work.
                </p>
              </Reveal>
              <div className="sw-swarm-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(var(--swarm-cols, 2), 1fr)', gap: 20 }}>
                <Reveal delay={0.06}>
                  <article className="sw-card" style={{ height: '100%', padding: '32px 30px 30px', display: 'flex', flexDirection: 'column' }}>
                    <span className="sw-badge" style={{ marginBottom: 22 }}>
                      <span className="sw-mini indigo" aria-hidden="true" />
                      Swarm 01 / Discovery
                    </span>
                    <h3 className="sw-h" style={{ fontSize: 24, marginBottom: 12 }}>Figures out what to build.</h3>
                    <p className="sw-muted" style={{ fontSize: 15, margin: 0, lineHeight: 1.65 }}>
                      Reads your evidence, infers the workflow, and shows you a sample to approve.
                    </p>
                    <span className="sw-card-foot" style={{ borderTop: '1px solid var(--rule)' }}>
                      <span className="sw-mini indigo" aria-hidden="true" /> The only swarm you talk to.
                    </span>
                  </article>
                </Reveal>
                <Reveal delay={0.12}>
                  <article className="sw-card" style={{ height: '100%', padding: '32px 30px 30px', display: 'flex', flexDirection: 'column' }}>
                    <span className="sw-badge" style={{ marginBottom: 22, color: 'var(--signal-ink)', borderColor: 'var(--signal)' }}>
                      <span className="sw-mini cyan" aria-hidden="true" />
                      Swarm 02 / Build
                    </span>
                    <h3 className="sw-h" style={{ fontSize: 24, marginBottom: 12 }}>Builds it — and only it.</h3>
                    <p className="sw-muted" style={{ fontSize: 15, margin: 0, lineHeight: 1.65 }}>
                      Assembles only the parts your workflow needs, and refuses the parts it doesn&apos;t.
                    </p>
                    <span className="sw-card-foot" style={{ borderTop: '1px solid var(--rule)', color: 'var(--signal-ink)' }}>
                      <span className="sw-mini cyan" aria-hidden="true" /> The swarm you never see.
                    </span>
                  </article>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── inverted ink slab for a confident close ── */}
          <section className="sw-panel" id="build" aria-labelledby="final-title">
            <div className="sw-wrap">
              <Reveal>
                <div className="sw-cta-slab">
                  <span style={{ ...LABEL, color: 'rgba(241,236,225,0.6)' }}>Start here</span>
                  <h2 id="final-title" className="sw-h" style={{ fontSize: 'clamp(30px, 6vw, 66px)', margin: '18px 0 18px', color: 'var(--paper)', maxWidth: '16ch' }}>
                    Hand us what you have.
                  </h2>
                  <p style={{ fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'rgba(241,236,225,0.72)', maxWidth: '46ch', margin: '0 0 30px', lineHeight: 1.6 }}>
                    A sample of the result and a couple of examples is enough to start.
                  </p>
                  <Link className="sw-btn invert" href="/factory">Build a workflow</Link>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>

      {/* Home-only leaf styles (editorial details that don't belong in the kit). */}
      <style jsx>{`
        .sw-masthead {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--ink);
          padding-top: 14px;
          margin-bottom: clamp(28px, 6vh, 60px);
        }
        .sw-hero-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 28px;
          margin-top: clamp(28px, 5vh, 48px);
          align-items: end;
        }
        @media (min-width: 880px) {
          .sw-hero-grid { grid-template-columns: 1.1fr 1fr; gap: 56px; }
        }
        .sw-step-index {
          font-family: var(--font-bricolage), sans-serif;
          font-size: 44px;
          font-weight: 700;
          line-height: 1;
          color: var(--ink);
          opacity: 0.14;
          margin-bottom: 18px;
        }
        .sw-card-foot {
          margin-top: auto;
          padding-top: 22px;
          display: inline-flex;
          align-items: center;
          gap: 9px;
          font-family: var(--font-geist-mono), monospace;
          font-size: 11.5px;
          letter-spacing: 0.04em;
          color: var(--ink-dim);
        }
        .sw-cta-slab {
          background: var(--ink);
          padding: clamp(40px, 7vw, 88px) clamp(26px, 5vw, 72px);
          border-radius: 3px;
        }
      `}</style>
    </>
  );
}

const STEPS = [
  { num: '01', title: 'Describe', body: 'Say what you want, and upload whatever you already have.' },
  { num: '02', title: 'Review', body: 'See a sample of the finished work and the inputs behind it. Comment or change anything.' },
  { num: '03', title: 'Build', body: 'Approve, and we build the workflow — only the pieces it actually needs.' },
] as const;
