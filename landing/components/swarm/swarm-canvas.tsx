'use client';

// The Living Swarm — a real boids/flocking simulation rendered to a fixed
// full-viewport canvas. Ported from the approved design mockup. Props-driven so
// pages orchestrate it:
//   - assembled: when true, the swarm self-organizes into the two-swarm pipeline
//     (Discovery cluster → approve gate → Build cluster). The home hero drives
//     this via "Watch it build" + scroll.
//   - dim: 0..1 canvas opacity (home dims it as you scroll past the hero).
//   - interactive: pointer force field on/off.
//   - density: 'full' (hero) or 'calm' (ambient backdrop on inner pages).
//
// Engine details kept from the original: struct-of-arrays particles, spatial
// hash for O(n) neighbor queries, cached glow sprites, an adaptive FPS governor
// that sheds agents on weak hardware, RAF pause on tab hide, and a
// prefers-reduced-motion static fallback.

import { useEffect, useRef } from 'react';

export interface SwarmCanvasProps {
  assembled?: boolean;
  dim?: number;
  interactive?: boolean;
  density?: 'full' | 'calm';
}

export default function SwarmCanvas({
  assembled = false,
  dim = 1,
  interactive = true,
  density = 'full',
}: SwarmCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(0);
  const dimRef = useRef(dim);
  const interactiveRef = useRef(interactive);
  const densityRef = useRef(density);

  useEffect(() => { modeRef.current = assembled ? 1 : 0; }, [assembled]);
  useEffect(() => { dimRef.current = dim; }, [dim]);
  useEffect(() => { interactiveRef.current = interactive; }, [interactive]);
  useEffect(() => { densityRef.current = density; }, [density]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let DPR = 1, W = 0, H = 0;
    let N = 0;
    let px!: Float32Array, py!: Float32Array, vx!: Float32Array, vy!: Float32Array;
    let tx!: Float32Array, ty!: Float32Array, hue!: Float32Array, sz!: Float32Array;
    let assignZone!: Uint8Array;

    const pointer = { x: -9999, y: -9999, active: false, down: false };
    let mode = 0;
    let assembly = 0;
    let gateX = 0, streamY = 0;

    const CELL = 64;
    let cols = 0, rows = 0;
    let gridHeads!: Int32Array, gridNext!: Int32Array;

    const PERCEPTION = 46, PERC2 = PERCEPTION * PERCEPTION, MAXSPEED = 2.6, MAXFORCE = 0.05;
    const SPRITE_BUCKETS = 12, SPRITE_R = 26;
    const SPRITES: HTMLCanvasElement[] = [];

    const frac = (x: number) => { x = x % 1; return x < 0 ? x + 1 : x; };
    const hashAngle = (i: number) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
    const clampF = (v: number) => (v > MAXFORCE ? MAXFORCE : v < -MAXFORCE ? -MAXFORCE : v);
    // Ink gradient: dark warm ink → mid warm ink. A monochrome stipple on paper,
    // no neon. The vermilion signal is a separate sprite (see buildSprites).
    const lerpColor = (t: number): [number, number, number] => [
      Math.round(28 + (94 - 28) * t),
      Math.round(26 + (88 - 26) * t),
      Math.round(18 + (72 - 18) * t),
    ];

    function targetCount() {
      const area = W * H;
      let n = Math.round(area / 1700);
      if (n < 320) n = 320;
      if (n > 1300) n = 1300;
      if (W < 540) n = Math.min(n, 520);
      else if (W < 900) n = Math.min(n, 820);
      if (densityRef.current === 'calm') n = Math.min(n, W < 700 ? 220 : 420);
      return n;
    }

    function allocate(n: number) {
      N = n;
      px = new Float32Array(n); py = new Float32Array(n);
      vx = new Float32Array(n); vy = new Float32Array(n);
      tx = new Float32Array(n); ty = new Float32Array(n);
      hue = new Float32Array(n); sz = new Float32Array(n);
      assignZone = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        px[i] = Math.random() * W;
        py[i] = Math.random() * H;
        const a = Math.random() * Math.PI * 2;
        const s = 0.4 + Math.random() * 0.9;
        vx[i] = Math.cos(a) * s; vy[i] = Math.sin(a) * s;
        hue[i] = Math.random();
        sz[i] = 0.8 + Math.random() * 1.7;
      }
    }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas!.width = Math.floor(W * DPR); canvas!.height = Math.floor(H * DPR);
      canvas!.style.width = W + 'px'; canvas!.style.height = H + 'px';
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      rebuildTargets();
    }

    function buildGrid() {
      cols = Math.max(1, Math.ceil(W / CELL));
      rows = Math.max(1, Math.ceil(H / CELL));
      gridHeads = new Int32Array(cols * rows).fill(-1);
      gridNext = new Int32Array(N).fill(-1);
      for (let i = 0; i < N; i++) {
        let cx = (px[i] / CELL) | 0, cy = (py[i] / CELL) | 0;
        if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
        if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
        const ci = cy * cols + cx;
        gridNext[i] = gridHeads[ci]; gridHeads[ci] = i;
      }
    }

    function rebuildTargets() {
      if (!N) return;
      const portrait = W < 720;
      const clusterR = Math.min(W, H) * 0.15;
      let aCx, aCy, bCx, bCy, gx, gy;
      if (portrait) {
        gx = W * 0.5; gy = H * 0.5; aCx = W * 0.5; aCy = H * 0.3; bCx = W * 0.5; bCy = H * 0.7;
      } else {
        gx = W * 0.5; gy = H * 0.46; aCx = W * 0.24; aCy = H * 0.46; bCx = W * 0.76; bCy = H * 0.46;
      }
      for (let i = 0; i < N; i++) {
        const r = i / N;
        if (r < 0.38) {
          assignZone[i] = 0;
          const ang = hashAngle(i) * Math.PI * 2;
          const rad = clusterR * Math.sqrt(0.05 + 0.95 * frac(i * 0.123));
          tx[i] = aCx + Math.cos(ang) * rad; ty[i] = aCy + Math.sin(ang) * rad * 0.92;
          hue[i] = 0.7 + 0.3 * frac(i * 0.37);
        } else if (r < 0.62) {
          assignZone[i] = 1;
          const t = (r - 0.38) / 0.24;
          const sx = aCx + t * (bCx - aCx), sy = aCy + t * (bCy - aCy);
          const wob = Math.sin(t * Math.PI * 2 + i) * 16, jitter = (frac(i * 0.71) - 0.5) * 14;
          if (portrait) { tx[i] = sx + wob + jitter; ty[i] = sy; }
          else { tx[i] = sx; ty[i] = sy + wob + jitter; }
          hue[i] = frac(i * 0.5);
        } else {
          assignZone[i] = 2;
          const ang2 = hashAngle(i + 7) * Math.PI * 2;
          const rad2 = clusterR * Math.sqrt(0.05 + 0.95 * frac(i * 0.231));
          tx[i] = bCx + Math.cos(ang2) * rad2; ty[i] = bCy + Math.sin(ang2) * rad2 * 0.92;
          hue[i] = 0.0 + 0.32 * frac(i * 0.53);
        }
      }
      gateX = gx; streamY = gy;
    }

    // Crisp ink dot: solid core, soft edge, NO white highlight (which would punch
    // a hole on paper). Used for both the ink gradient and the vermilion signal.
    function makeDot(rgb: [number, number, number]) {
      const size = SPRITE_R * 2;
      const oc = document.createElement('canvas');
      oc.width = size; oc.height = size;
      const g = oc.getContext('2d')!;
      const cx = SPRITE_R, cy = SPRITE_R;
      const grad = g.createRadialGradient(cx, cy, 0, cx, cy, SPRITE_R);
      grad.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
      grad.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.9)`);
      grad.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      g.fillStyle = grad; g.fillRect(0, 0, size, size);
      return oc;
    }
    function buildSprites() {
      SPRITES.length = 0;
      for (let b = 0; b < SPRITE_BUCKETS; b++) {
        SPRITES.push(makeDot(lerpColor(b / (SPRITE_BUCKETS - 1))));
      }
      SPRITES.push(makeDot([229, 64, 42])); // index SPRITE_BUCKETS = vermilion signal
    }

    let t0 = performance.now();
    function stepSim(now: number) {
      const dt = Math.min(2, (now - t0) / 16.67) || 1;
      t0 = now;
      const wantAssembly = mode === 1 ? 1 : 0;
      assembly += (wantAssembly - assembly) * 0.04;
      if (assembly < 0.001 && mode === 0) assembly = 0;
      buildGrid();
      const flockW = 1 - Math.min(1, assembly * 1.15);
      const usePointer = interactiveRef.current && pointer.active;

      for (let i = 0; i < N; i++) {
        const x0 = px[i], y0 = py[i];
        let x = x0, y = y0;
        let sepX = 0, sepY = 0, aliX = 0, aliY = 0, cohX = 0, cohY = 0, count = 0;
        if (flockW > 0.02) {
          let cx = (x / CELL) | 0, cy = (y / CELL) | 0;
          if (cx < 0) cx = 0; else if (cx >= cols) cx = cols - 1;
          if (cy < 0) cy = 0; else if (cy >= rows) cy = rows - 1;
          for (let gy = -1; gy <= 1; gy++) {
            const ry = cy + gy; if (ry < 0 || ry >= rows) continue;
            for (let gx = -1; gx <= 1; gx++) {
              const rx = cx + gx; if (rx < 0 || rx >= cols) continue;
              let j = gridHeads[ry * cols + rx];
              while (j !== -1) {
                if (j !== i) {
                  const dx = x - px[j], dy = y - py[j], d2 = dx * dx + dy * dy;
                  if (d2 > 0 && d2 < PERC2) {
                    const inv = 1 / Math.sqrt(d2);
                    sepX += dx * inv * inv * 8; sepY += dy * inv * inv * 8;
                    aliX += vx[j]; aliY += vy[j]; cohX += px[j]; cohY += py[j]; count++;
                  }
                }
                j = gridNext[j];
              }
            }
          }
        }
        let ax = 0, ay = 0;
        if (count > 0 && flockW > 0.02) {
          aliX /= count; aliY /= count;
          const alM = Math.hypot(aliX, aliY) || 1;
          aliX = (aliX / alM) * MAXSPEED - vx[i]; aliY = (aliY / alM) * MAXSPEED - vy[i];
          cohX = cohX / count - x; cohY = cohY / count - y;
          const coM = Math.hypot(cohX, cohY) || 1;
          cohX = (cohX / coM) * MAXSPEED - vx[i]; cohY = (cohY / coM) * MAXSPEED - vy[i];
          const seM = Math.hypot(sepX, sepY);
          if (seM > 0) { sepX = (sepX / seM) * MAXSPEED - vx[i]; sepY = (sepY / seM) * MAXSPEED - vy[i]; }
          ax += clampF(sepX) * 1.6 + clampF(aliX) * 1.0 + clampF(cohX) * 0.9;
          ay += clampF(sepY) * 1.6 + clampF(aliY) * 1.0 + clampF(cohY) * 0.9;
        }
        ax *= flockW; ay *= flockW;
        if (usePointer) {
          const pdx = x - pointer.x, pdy = y - pointer.y, pd2 = pdx * pdx + pdy * pdy;
          const R = pointer.down ? 230 : 165;
          if (pd2 < R * R && pd2 > 0.01) {
            const pd = Math.sqrt(pd2), falloff = 1 - pd / R, pf = falloff * falloff;
            if (pointer.down) {
              const swirl = 0.9;
              ax += (-pdx / pd) * pf * 1.4 + (-pdy / pd) * swirl * pf;
              ay += (-pdy / pd) * pf * 1.4 + (pdx / pd) * swirl * pf;
            } else { ax += (pdx / pd) * pf * 1.5; ay += (pdy / pd) * pf * 1.5; }
          }
        }
        if (assembly > 0.01) {
          let aty = ty[i];
          if (assignZone[i] === 1) aty += Math.sin(frac(i * 0.013 + now * 0.0006) * Math.PI * 2) * 3;
          const sdx = tx[i] - x, sdy = aty - y, sd = Math.hypot(sdx, sdy) || 1;
          const pull = Math.min(1.4, sd * 0.02), k = assembly * 0.9;
          ax += (sdx / sd) * pull * k * 3.4; ay += (sdy / sd) * pull * k * 3.4;
          vx[i] *= 1 - 0.03 * assembly; vy[i] *= 1 - 0.03 * assembly;
        }
        vx[i] += ax * dt; vy[i] += ay * dt;
        const spd = Math.hypot(vx[i], vy[i]), lim = MAXSPEED * (1 + assembly * 0.3);
        if (spd > lim) { vx[i] = (vx[i] / spd) * lim; vy[i] = (vy[i] / spd) * lim; }
        x += vx[i] * dt; y += vy[i] * dt;
        if (assembly < 0.5) {
          if (x < -20) x = W + 20; else if (x > W + 20) x = -20;
          if (y < -20) y = H + 20; else if (y > H + 20) y = -20;
        } else {
          if (x < 0) { x = 0; vx[i] *= -0.4; } else if (x > W) { x = W; vx[i] *= -0.4; }
          if (y < 0) { y = 0; vy[i] *= -0.4; } else if (y > H) { y = H; vy[i] *= -0.4; }
        }
        px[i] = x; py[i] = y;
      }
    }

    function render() {
      // Ink on paper: clear to transparent (the CSS paper ground shows through),
      // normal compositing — additive would wash the page white.
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = 'source-over';
      const assemblyScale = 1 + assembly * 0.2;
      const assembled = mode === 1;
      for (let i = 0; i < N; i++) {
        const s = sz[i] * assemblyScale;
        const spd = Math.abs(vx[i]) + Math.abs(vy[i]);
        // Vermilion is rare in the free flock; assembled, it marks the Build
        // cluster (zone 2). Discovery + the connecting stream stay ink.
        const signal = assembled ? assignZone[i] === 2 : (i & 7) === 0;
        const dr = s * (signal ? 3.6 : 4.0);
        const bkt = signal ? SPRITE_BUCKETS : ((hue[i] * (SPRITE_BUCKETS - 1) + 0.5) | 0);
        ctx!.globalAlpha = Math.min(1, (signal ? 0.8 : 0.42) + Math.min(0.25, spd * 0.1));
        ctx!.drawImage(SPRITES[bkt], px[i] - dr, py[i] - dr, dr * 2, dr * 2);
      }
      ctx!.globalAlpha = 1;
      if (assembly > 0.35) {
        const a = (assembly - 0.35) / 0.65;
        ctx!.strokeStyle = `rgba(23,21,15,${0.5 * a})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath(); ctx!.arc(gateX, streamY, 48, 0, 6.2832); ctx!.stroke();
      }
    }

    function renderStaticFrame() {
      ctx!.clearRect(0, 0, W, H);
      ctx!.globalCompositeOperation = 'source-over';
      for (let i = 0; i < N; i++) {
        const dr = sz[i] * 1.6 * 4.0;
        const signal = (i & 7) === 0;
        const bkt = signal ? SPRITE_BUCKETS : ((hue[i] * (SPRITE_BUCKETS - 1) + 0.5) | 0);
        ctx!.globalAlpha = signal ? 0.8 : 0.5;
        ctx!.drawImage(SPRITES[bkt], px[i] - dr, py[i] - dr, dr * 2, dr * 2);
      }
      ctx!.globalAlpha = 1;
    }

    let running = true, rafId: number | null = null;
    let avgDt = 16.7, lastFrameT = 0, slowStreak = 0, lastAdjust = 0;
    const qualityFloor = 220;
    function frame(now: number) {
      if (!running) return;
      mode = modeRef.current;
      if (lastFrameT) {
        const fdt = now - lastFrameT;
        if (fdt > 0 && fdt < 1000) avgDt += (fdt - avgDt) * 0.1;
        if (now - lastAdjust > 900) {
          if (avgDt > 26 && N > qualityFloor) {
            slowStreak++;
            if (slowStreak >= 3) {
              allocate(Math.max(qualityFloor, Math.round(N * 0.8)));
              rebuildTargets(); slowStreak = 0; avgDt = 18; lastAdjust = now;
            }
          } else slowStreak = 0;
        }
      }
      lastFrameT = now;
      stepSim(now);
      render();
      if (canvas) canvas.style.opacity = String(dimRef.current);
      rafId = requestAnimationFrame(frame);
    }

    // pointer
    const onMove = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; };
    const onDown = (e: PointerEvent) => { pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; };
    const onUp = () => { pointer.down = false; };
    const onLeave = () => { pointer.active = false; };
    const onTouch = (e: TouchEvent) => { if (e.touches[0]) { pointer.x = e.touches[0].clientX; pointer.y = e.touches[0].clientY; pointer.active = true; } };
    const onTouchEnd = () => { pointer.active = false; pointer.down = false; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    const onVisible = () => {
      if (document.hidden) { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = null; }
      else if (!reduceMotion && !running) { running = true; t0 = performance.now(); rafId = requestAnimationFrame(frame); }
    };
    document.addEventListener('visibilitychange', onVisible);

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    const onResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const oldN = N; resize();
        const want = targetCount();
        if (Math.abs(want - oldN) > oldN * 0.25) allocate(want);
        rebuildTargets();
        if (reduceMotion) renderStaticFrame();
      }, 180);
    };
    window.addEventListener('resize', onResize);

    // boot
    buildSprites();
    resize();
    allocate(targetCount());
    rebuildTargets();
    if (reduceMotion) { if (canvas) canvas.style.opacity = String(dimRef.current); renderStaticFrame(); }
    else rafId = requestAnimationFrame(frame);

    return () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      if (resizeTimer) clearTimeout(resizeTimer);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="swarm-canvas" aria-hidden="true" />
      <div className="swarm-grain" aria-hidden="true" />
      <div className="swarm-vignette" aria-hidden="true" />
    </>
  );
}
