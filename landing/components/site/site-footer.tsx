import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="relative z-20 border-t border-white/10 bg-black">
      <div className="container mx-auto px-6 lg:px-16 py-12 lg:py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="font-mono text-white text-lg font-bold tracking-widest italic transform -skew-x-12 inline-block mb-3">
              BOVERSE
            </div>
            <p className="text-xs text-white/50 font-mono leading-relaxed max-w-xs">
              The workflow factory. You describe it, we build it.
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-2 text-[11px] lg:text-xs font-mono tracking-widest">
            <Link href="/#how" className="text-white/60 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">HOW IT WORKS</Link>
            <Link href="/factory" className="text-white/60 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">BUILD WORKFLOW</Link>
            <a href="mailto:hello@boverse.ai" className="text-white/60 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">CONTACT</a>
          </nav>
        </div>

        <div className="mt-10 lg:mt-12 pt-6 border-t border-white/10 text-[10px] font-mono text-white/40 tracking-widest">
          © 2026 BOVERSE
        </div>
      </div>
    </footer>
  );
}
