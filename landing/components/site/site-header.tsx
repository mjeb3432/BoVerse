import Link from 'next/link';

// Shared Living Swarm header. Fixed glass bar: brand + "How it works" + the
// Build Workflow pill. Used on every page so the chrome is consistent.
export default function SiteHeader() {
  return (
    <header className="sw-header">
      <Link href="/" className="sw-brand" aria-label="BoVerse home">
        <span className="sw-dot" aria-hidden="true" />
        BOVERSE
      </Link>
      <nav className="sw-nav" aria-label="Primary">
        <Link href="/#how" className="sw-navlink hidden sm:inline">
          How it works
        </Link>
        <Link href="/factory" className="sw-btn sm">
          Build workflow
        </Link>
      </nav>
    </header>
  );
}
