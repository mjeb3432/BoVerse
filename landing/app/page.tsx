'use client';

// BoVerse home — the Living Swarm showcase. A real boids canvas backdrop
// (SwarmCanvas) self-assembles into the two-swarm pipeline while a build HUD
// fades in. The hero copy recedes, the swarm becomes the star, and a live
// "Discovery → approve → Build" diagram plays. Scroll past the hero (or click
// "Watch it build") to trigger it; scroll on past the hero to dissolve.
//
// The page only orchestrates state (assembled / dim) + the scroll listener;
// all visuals come from the shared Living Swarm design system (SwarmCanvas,
// Reveal, SiteHeader, SiteFooter, and the sw- CSS classes in globals.css).
// The root layout supplies <body className="sw"> + metadata, so this page
// needs neither. Convention: Swarm 1 / Discovery = cyan, Swarm 2 / Build = indigo.

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import SwarmCanvas from '@/components/swarm/swarm-canvas';
import Reveal from '@/components/swarm/reveal';
import SiteHeader from '@/components/site/site-header';
import SiteFooter from '@/components/site/site-footer';

// The sw- kit ports the container classes (sw-hud-card, sw-card, sw-step…) but
// not the nested leaf rules the mockup scoped inline. We re-create just those
// leaves here so the rendered surfaces match the approved mockup 1:1.
const TAG = {
  fontFamily: 'var(--font-space-grotesk), sans-serif',
  fontSize: 11,
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  fontWeight: 600,
  marginBottom: 6,
} as const;

const HUD_H4 = { fontSize: 'clamp(15px, 2.4vw, 19px)', marginBottom: 4 } as const;
const HUD_P = { fontSize: 12.5, color: 'var(--sw-muted)', margin: 0, lineHeight: 1.45 } as const;

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
      // fraction of the hero still visible (1 at top, 0 once scrolled past)
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : vh - y;
      const heroVisible = Math.max(0, Math.min(1, heroBottom / vh));
      // Assemble once the user nudges down but while >55% of the hero remains,
      // so the decorative HUD never paints over the content sections below.
      const wantAssembled = y > vh * 0.12 && heroVisible > 0.55;
      if (wantAssembled !== assembledRef.current) setAssembled(wantAssembled);
      // Calm the swarm down past the hero so sections read clearly, but keep
      // the particle accent alive (never fully gone).
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
      // when assembling via the button, push the backdrop bright
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

      {/* Live build HUD — fades in while the swarm assembles into the pipeline */}
      <div className={`sw-hud${assembled ? ' show' : ''}`} aria-hidden="true">
        <div className="sw-hud-grid">
          <div className="sw-hud-card c1">
            <div className="sw-h" style={{ ...TAG, color: 'var(--sw-cyan)' }}>Swarm 1 · Discovery</div>
            <h4 className="sw-h" style={HUD_H4}>Infers the workflow</h4>
            <p style={HUD_P}>Reads your evidence and shows a sample to approve.</p>
          </div>
          <div className="sw-hud-gate">
            <div className="sw-ring"><span /></div>
            <div className="sw-h" style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--sw-white)' }}>Approve</div>
          </div>
          <div className="sw-hud-card c2">
            <div className="sw-h" style={{ ...TAG, color: 'var(--sw-indigo)' }}>Swarm 2 · Build</div>
            <h4 className="sw-h" style={HUD_H4}>Assembles the parts</h4>
            <p style={HUD_P}>Only the pieces your workflow actually needs.</p>
          </div>
        </div>
        <p className="sw-muted-2" style={{ marginTop: 22, textAlign: 'center', fontSize: 12, letterSpacing: '0.04em' }}>
          Move your cursor through the swarm · scroll to dissolve
        </p>
      </div>

      <div className={`sw-content${assembled ? ' sw-assembling' : ''}`}>
        <main id="main">
          {/* ── HERO ── */}
          <section ref={heroRef} className="sw-hero" aria-labelledby="hero-title">
            <div className="sw-hero-glass glass">
              <span className="sw-eyebrow">
                <span className="sw-spark" aria-hidden="true" />
                The workflow factory
              </span>
              <h1 id="hero-title" className="sw-h sw-gradient">
                Describe it.<br />We build it.
              </h1>
              <p className="sw-subhead">
                Tell BoVerse the outcome you want and upload whatever you already have. Two AI
                swarms infer the workflow and build it. You only review and approve.
              </p>
              <div className="sw-cta-row">
                <Link className="sw-btn" href="/factory">Build a workflow</Link>
                <button
                  type="button"
                  id="watch"
                  className="sw-btn ghost"
                  aria-pressed={assembled}
                  onClick={toggleWatch}
                >
                  <span aria-hidden="true">{assembled ? '❚❚' : '▶'}</span>{' '}
                  {assembled ? 'Dissolve' : 'Watch it build'}
                </button>
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
                <span className="sw-kicker">Why BoVerse</span>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 id="why-title" className="sw-h sw-gradient" style={{ fontSize: 'clamp(28px, 5.2vw, 52px)', maxWidth: '16ch', margin: '18px 0 24px' }}>
                  Your business runs on one person&apos;s instinct.
                </h2>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="sw-muted" style={{ fontSize: 'clamp(16px, 2.4vw, 20px)', maxWidth: '60ch', lineHeight: 1.7 }}>
                  The person who has priced your jobs for fifteen years carries the whole logic in
                  their head. It isn&apos;t written down, it doesn&apos;t survive a resignation, and it
                  never gets applied the same way twice.{' '}
                  <strong style={{ color: 'var(--sw-white)', fontWeight: 600 }}>
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
                <span className="sw-kicker">How it works</span>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 id="how-title" className="sw-h sw-gradient" style={{ fontSize: 'clamp(28px, 5vw, 48px)', maxWidth: '18ch', margin: '18px 0 0' }}>
                  Three steps. You stay in control of every one.
                </h2>
              </Reveal>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(var(--how-cols, 3), 1fr)',
                  gap: 18,
                  marginTop: 48,
                }}
                className="sw-how-grid"
              >
                {STEPS.map((s, i) => (
                  <Reveal key={s.num} delay={0.08 * (i + 1)}>
                    <article className="sw-step" style={{ height: '100%' }}>
                      <div style={{ fontFamily: 'var(--font-space-grotesk), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.22em', color: 'var(--sw-cyan)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span aria-hidden="true" style={{ fontSize: 42, fontWeight: 700, color: 'rgba(140,165,255,0.16)', lineHeight: 1 }}>{s.num}</span>
                        Step
                      </div>
                      <h3 className="sw-h" style={{ fontSize: 21, marginBottom: 10, letterSpacing: '0.01em' }}>{s.title}</h3>
                      <p className="sw-muted" style={{ fontSize: 14.5, margin: 0 }}>{s.body}</p>
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
                <span className="sw-kicker">Under the hood</span>
              </Reveal>
              <Reveal delay={0.08}>
                <p id="swarms-title" className="sw-h" style={{ fontSize: 'clamp(18px, 3vw, 26px)', color: 'var(--sw-white)', maxWidth: '30ch', margin: '18px 0 44px', lineHeight: 1.4, fontWeight: 500 }}>
                  Behind those three steps, two swarms of AI agents do the work.
                </p>
              </Reveal>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(var(--swarm-cols, 2), 1fr)', gap: 20 }} className="sw-swarm-grid">
                <Reveal delay={0.08}>
                  <article className="sw-card" style={{ height: '100%', padding: '34px 32px 32px', display: 'flex', flexDirection: 'column' }}>
                    <span className="sw-orb cyan" aria-hidden="true" />
                    <span className="sw-badge" style={{ color: 'var(--sw-cyan)', marginBottom: 20 }}>
                      <span className="sw-mini cyan" aria-hidden="true" />
                      Swarm 1 · Discovery
                    </span>
                    <h3 className="sw-h" style={{ fontSize: 23, marginBottom: 12 }}>Figures out what to build.</h3>
                    <p className="sw-muted" style={{ fontSize: 15, margin: 0, lineHeight: 1.65 }}>
                      Reads your evidence, infers the workflow, and shows you a sample to approve.
                    </p>
                    <span style={{ marginTop: 'auto', paddingTop: 22, fontSize: 12.5, color: 'var(--sw-cyan)', fontFamily: 'var(--font-space-grotesk), sans-serif', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--sw-line)' }}>
                      <span className="sw-mini cyan" aria-hidden="true" /> The only swarm you talk to.
                    </span>
                  </article>
                </Reveal>
                <Reveal delay={0.16}>
                  <article className="sw-card" style={{ height: '100%', padding: '34px 32px 32px', display: 'flex', flexDirection: 'column' }}>
                    <span className="sw-orb indigo" aria-hidden="true" />
                    <span className="sw-badge" style={{ color: 'var(--sw-indigo)', marginBottom: 20 }}>
                      <span className="sw-mini indigo" aria-hidden="true" />
                      Swarm 2 · Build
                    </span>
                    <h3 className="sw-h" style={{ fontSize: 23, marginBottom: 12 }}>Builds it — and only it.</h3>
                    <p className="sw-muted" style={{ fontSize: 15, margin: 0, lineHeight: 1.65 }}>
                      Assembles only the parts your workflow needs, and refuses the parts it doesn&apos;t.
                    </p>
                    <span style={{ marginTop: 'auto', paddingTop: 22, fontSize: 12.5, color: 'var(--sw-indigo)', fontFamily: 'var(--font-space-grotesk), sans-serif', letterSpacing: '0.05em', display: 'inline-flex', alignItems: 'center', gap: 8, borderTop: '1px solid var(--sw-line)' }}>
                      <span className="sw-mini indigo" aria-hidden="true" /> The swarm you never see.
                    </span>
                  </article>
                </Reveal>
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ── */}
          <section className="sw-panel" id="build" aria-labelledby="final-title" style={{ textAlign: 'center' }}>
            <div className="sw-wrap">
              <Reveal>
                <div
                  className="glass"
                  style={{
                    maxWidth: 720,
                    margin: '0 auto',
                    padding: 'clamp(40px, 7vw, 72px) clamp(24px, 5vw, 56px)',
                    background:
                      'radial-gradient(600px 300px at 50% -10%, rgba(56,225,255,0.1), transparent 60%), linear-gradient(180deg, rgba(14,19,38,0.7), rgba(8,11,22,0.7))',
                  }}
                >
                  <h2 id="final-title" className="sw-h sw-gradient" style={{ fontSize: 'clamp(28px, 5.4vw, 54px)', marginBottom: 18 }}>
                    Hand us what you have.<br />We&apos;ll build the workflow.
                  </h2>
                  <p className="sw-muted" style={{ fontSize: 'clamp(15px, 2.3vw, 18px)', maxWidth: '50ch', margin: '0 auto 30px' }}>
                    A sample of the result and a couple of examples is enough to start.
                  </p>
                  <Link className="sw-btn" href="/factory">Build a workflow</Link>
                </div>
              </Reveal>
            </div>
          </section>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}

const STEPS = [
  { num: '01', title: 'Describe', body: 'Say what you want, and upload whatever you already have.' },
  { num: '02', title: 'Review', body: 'We show you a sample of the finished work and the inputs behind it. Comment or change anything.' },
  { num: '03', title: 'Build', body: 'Approve, and we build the workflow, only the pieces it actually needs.' },
] as const;
