import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BoVerse · Describe it. We build it.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Editorial Paper social card: warm paper, ink type, a stipple of ink particles
// flowing toward the "build" with the vermilion signal at the destination.
// Satori-safe (flex + solid fills only).
const DOTS = [
  { x: 250, y: 250, r: 6, c: '#3a362c', o: 0.7 },
  { x: 300, y: 330, r: 4, c: '#6a6354', o: 0.6 },
  { x: 360, y: 230, r: 8, c: '#17150f', o: 0.85 },
  { x: 420, y: 320, r: 5, c: '#3a362c', o: 0.6 },
  { x: 470, y: 262, r: 7, c: '#17150f', o: 0.8 },
  { x: 540, y: 300, r: 5, c: '#6a6354', o: 0.55 },
  { x: 600, y: 240, r: 7, c: '#3a362c', o: 0.7 },
  { x: 660, y: 320, r: 4, c: '#6a6354', o: 0.5 },
  { x: 720, y: 270, r: 8, c: '#17150f', o: 0.85 },
  { x: 800, y: 252, r: 6, c: '#3a362c', o: 0.7 },
  { x: 858, y: 300, r: 8, c: '#e5402a', o: 0.95 },
  { x: 912, y: 268, r: 12, c: '#e5402a', o: 1 },
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
          backgroundColor: '#f1ece1',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        {/* swarm dots (ink stipple → vermilion at the build end) */}
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
            }}
          />
        ))}

        {/* content */}
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', flex: 1, padding: '60px 80px', justifyContent: 'space-between' }}>
          {/* masthead rule */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', height: 2, backgroundColor: '#17150f' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', width: 14, height: 14, backgroundColor: '#e5402a', transform: 'rotate(45deg)' }} />
                <span style={{ color: '#17150f', fontSize: 22, fontWeight: 700, letterSpacing: '0.06em' }}>BOVERSE</span>
              </div>
              <span style={{ color: '#837c6c', fontSize: 16, letterSpacing: '0.22em' }}>THE WORKFLOW FACTORY</span>
            </div>
          </div>

          {/* headline */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', flexDirection: 'column', fontSize: 120, fontWeight: 700, lineHeight: 0.92, letterSpacing: '-0.04em', color: '#17150f' }}>
              <span>Describe it.</span>
              <span>We build it.</span>
            </div>
            <div style={{ display: 'flex', marginTop: 32, maxWidth: 760, fontSize: 25, lineHeight: 1.45, color: '#4f4a3f' }}>
              Two AI swarms infer your workflow and build it. You only review and approve.
            </div>
          </div>

          {/* bottom chrome */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 16, letterSpacing: '0.16em', paddingTop: 14, borderTop: '1px solid rgba(23,21,15,0.16)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#4f4a3f' }}>
              <span>SWARM 01 / DISCOVERY</span>
              <span style={{ color: '#837c6c' }}>/</span>
              <span style={{ color: '#c0341f' }}>SWARM 02 / BUILD</span>
            </div>
            <span style={{ color: '#837c6c' }}>boverse.ai</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
