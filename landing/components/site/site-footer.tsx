import Link from 'next/link';

// Shared Editorial Paper footer.
export default function SiteFooter() {
  return (
    <footer className="sw-footer">
      <div className="sw-foot-wrap">
        <span className="sw-brand">
          <span className="sw-dot" aria-hidden="true" />
          BOVERSE
        </span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
          <Link href="/#how" className="sw-navlink">How it works</Link>
          <Link href="/factory" className="sw-navlink">Build workflow</Link>
          <a href="mailto:hello@boverse.ai" className="sw-navlink">Contact</a>
        </nav>
        <span className="sw-muted-2" style={{ fontSize: 13 }}>© 2026 BoVerse</span>
      </div>
    </footer>
  );
}
