import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import Link from "next/link";

// Editorial Paper 404 — warm paper, ink type, one vermilion signal. Mirrors the
// site's print-spec language (masthead rule, monospaced index, numbered routes).
export default function NotFound() {
  return (
    <div className="sw min-h-screen flex flex-col" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <SiteHeader />

      <main id="main" className="flex-1">
        <section className="sw-panel" style={{ paddingTop: "clamp(120px,18vh,200px)", paddingBottom: 0 }}>
          <div className="sw-wrap">
            {/* masthead rule */}
            <div
              className="flex items-center justify-between"
              style={{ borderTop: "1px solid var(--ink)", paddingTop: 14, marginBottom: "clamp(32px,7vh,72px)" }}
            >
              <span className="sw-mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-dim)" }}>Error / 404</span>
              <span className="sw-mono" style={{ fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Route unresolved</span>
            </div>

            <h1 className="sw-h" style={{ fontSize: "clamp(52px,13vw,160px)", lineHeight: 0.92, letterSpacing: "-0.04em", marginBottom: 8 }}>
              Not found.
            </h1>
            <p className="sw-muted" style={{ fontSize: "clamp(15px,2.2vw,19px)", lineHeight: 1.6, maxWidth: "46ch", margin: "22px 0 36px" }}>
              The page you&apos;re looking for doesn&apos;t exist at this path. The URL may be wrong,
              the page may have moved, or it was never here.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/" className="sw-btn">Back to home</Link>
              <Link href="/factory" className="sw-btn ghost">Build a workflow</Link>
            </div>
          </div>
        </section>

        {/* available routes — editorial index */}
        <section className="sw-panel" style={{ paddingTop: "clamp(56px,9vh,104px)" }}>
          <div className="sw-wrap">
            <span className="sw-kicker">Index / available routes</span>
            <ul style={{ marginTop: 28, borderTop: "1px solid var(--rule-2)" }}>
              {ROUTES.map((r) => (
                <li key={r.href}>
                  <Link
                    href={r.href}
                    className="sw-route group"
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "clamp(16px,3vw,32px)",
                      padding: "18px 4px",
                      borderBottom: "1px solid var(--rule)",
                    }}
                  >
                    <span className="sw-mono" style={{ fontSize: 12, color: "var(--ink-faint)", width: 36, flex: "none" }}>{r.num}</span>
                    <span className="sw-h" style={{ fontSize: "clamp(18px,2.4vw,24px)" }}>{r.path}</span>
                    <span className="sw-mono" style={{ fontSize: 12, color: "var(--ink-dim)", flex: 1, letterSpacing: "0.04em" }}>{r.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

const ROUTES = [
  { num: "01", href: "/", path: "/", label: "Home" },
  { num: "02", href: "/factory", path: "/factory", label: "Build a workflow" },
] as const;
