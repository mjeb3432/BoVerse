'use client';

// Magnetic button glow. The .sw-btn ::after radial highlight reads its position
// from --mx/--my; this drives those vars from the cursor so the cyan glow tracks
// the pointer across any button. One passive listener, rAF-coalesced, global.
// Pointer-driven (not autonomous motion), so it's safe under reduced-motion.

import { useEffect } from 'react';

export default function Magnetic() {
  useEffect(() => {
    let raf = 0;
    let pending: { el: HTMLElement; x: number; y: number } | null = null;

    const flush = () => {
      raf = 0;
      if (!pending) return;
      pending.el.style.setProperty('--mx', `${pending.x}%`);
      pending.el.style.setProperty('--my', `${pending.y}%`);
    };

    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.('.sw-btn') as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      pending = {
        el: target,
        x: ((e.clientX - r.left) / r.width) * 100,
        y: ((e.clientY - r.top) / r.height) * 100,
      };
      if (!raf) raf = requestAnimationFrame(flush);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
