import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'BoVerse · Atomic Workflows';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#000000',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        }}
      >
        {/* Top chrome row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 56px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            letterSpacing: '0.2em',
          }}
        >
          <span>SYSTEM.ACTIVE · WORKFLOW.FACTORY · v1.0</span>
          <span>EST. 2026</span>
        </div>

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
          }}
        >
          {/* Brand mark */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginBottom: 48,
            }}
          >
            <div
              style={{
                fontSize: 44,
                fontWeight: 700,
                fontStyle: 'italic',
                color: '#ffffff',
                letterSpacing: '0.15em',
                transform: 'skewX(-12deg)',
                display: 'flex',
              }}
            >
              BOVERSE
            </div>
            <div
              style={{
                height: 24,
                width: 1,
                background: 'rgba(255,255,255,0.4)',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, letterSpacing: '0.2em' }}>
              EST. 2026
            </span>
          </div>

          {/* Section marker */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              marginBottom: 32,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, letterSpacing: '0.2em' }}>
              001
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.2)', display: 'flex' }} />
          </div>

          {/* Headline */}
          <div
            style={{
              fontSize: 128,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 0.95,
              letterSpacing: '-0.02em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>ATOMIC</span>
            <span>WORKFLOWS</span>
          </div>

          {/* Tagline */}
          <div
            style={{
              marginTop: 40,
              fontSize: 22,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.02em',
              display: 'flex',
            }}
          >
            Where artifacts become workflows. Five primitives. Infinite forms.
          </div>
        </div>

        {/* Bottom chrome row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 56px',
            borderTop: '1px solid rgba(255,255,255,0.2)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            letterSpacing: '0.2em',
          }}
        >
          <span>∞ · PRIMITIVES</span>
          <span>boverse.ai</span>
        </div>
      </div>
    ),
    size,
  );
}
