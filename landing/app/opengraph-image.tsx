import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BoVerse · Describe it. We build it.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// A drifting swarm of particles flowing left→right toward the "build" — the
// Living Swarm brand, rendered for social cards. Satori-safe (flex + gradients).
const DOTS = [
  { x: 250, y: 250, r: 7, c: '#38e1ff', o: 0.9 },
  { x: 300, y: 330, r: 5, c: '#6e8bff', o: 0.7 },
  { x: 360, y: 230, r: 9, c: '#38e1ff', o: 0.8 },
  { x: 420, y: 320, r: 6, c: '#6e8bff', o: 0.6 },
  { x: 470, y: 260, r: 11, c: '#38e1ff', o: 0.95 },
  { x: 540, y: 300, r: 6, c: '#6e8bff', o: 0.7 },
  { x: 600, y: 240, r: 8, c: '#38e1ff', o: 0.85 },
  { x: 660, y: 320, r: 5, c: '#6e8bff', o: 0.6 },
  { x: 720, y: 270, r: 10, c: '#6e8bff', o: 0.9 },
  { x: 790, y: 250, r: 7, c: '#6e8bff', o: 0.75 },
  { x: 850, y: 300, r: 6, c: '#6e8bff', o: 0.7 },
  { x: 910, y: 270, r: 12, c: '#6e8bff', o: 1 },
];

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          backgroundColor: '#04060e',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {/* glow fields */}
        <div style={{ position: 'absolute', display: 'flex', top: -260, right: -180, width: 760, height: 760, borderRadius: 760, backgroundImage: 'radial-gradient(circle, rgba(56,225,255,0.20), rgba(56,225,255,0) 65%)' }} />
        <div style={{ position: 'absolute', display: 'flex', bottom: -320, left: -200, width: 820, height: 820, borderRadius: 820, backgroundImage: 'radial-gradient(circle, rgba(110,139,255,0.22), rgba(110,139,255,0) 65%)' }} />

        {/* swarm dots */}
        {DOTS.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              display: 'flex',
              left: d.x,
              top: d.y,
              width: d.r * 2,
              height: d.r * 2,
              borderRadius: d.r * 2,
              backgroundColor: d.c,
              opacity: d.o,
              boxShadow: `0 0 ${d.r * 3}px ${d.c}`,
            }}
          />
        ))}

        {/* content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, padding: '64px 80px', justifyContent: 'space-between' }}>
          {/* brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', width: 20, height: 20, borderRadius: 20, backgroundColor: '#38e1ff', boxShadow: '0 0 24px #38e1ff' }} />
            <span style={{ color: '#f3f6ff', fontSize: 24, fontWeight: 700, letterSpacing: '0.22em' }}>BOVERSE</span>
            <span style={{ color: 'rgba(154,166,200,0.8)', fontSize: 18, letterSpacing: '0.2em', marginLeft: 8 }}>THE WORKFLOW FACTORY</span>
          </div>

          {/* headline */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: 116,
                fontWeight: 700,
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                color: 'transparent',
                backgroundImage: 'linear-gradient(180deg, #ffffff 35%, #c4d2ff 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
              }}
            >
              <span>Describe it.</span>
              <span>We build it.</span>
            </div>
            <div style={{ display: 'flex', marginTop: 34, maxWidth: 760, fontSize: 25, lineHeight: 1.45, color: 'rgba(196,210,255,0.82)' }}>
              Two AI swarms infer your workflow and build it. You only review and approve.
            </div>
          </div>

          {/* bottom chrome */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 17, letterSpacing: '0.16em' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: 'rgba(154,166,200,0.85)' }}>
              <span style={{ color: '#38e1ff' }}>SWARM 1 · DISCOVERY</span>
              <span style={{ color: 'rgba(154,166,200,0.5)' }}>→</span>
              <span style={{ color: '#6e8bff' }}>SWARM 2 · BUILD</span>
            </div>
            <span style={{ color: 'rgba(154,166,200,0.7)' }}>boverse.ai</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
