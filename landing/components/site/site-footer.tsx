import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="relative z-20 border-t border-white/20 bg-black mt-20 lg:mt-32">
      {/* System chrome row */}
      <div className="border-b border-white/10">
        <div className="container mx-auto px-4 lg:px-8 py-2 lg:py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:gap-6 text-[8px] lg:text-[9px] font-mono text-white/50">
            <span className="hidden lg:inline">SYSTEM.ACTIVE</span>
            <span className="lg:hidden">SYS.ACT</span>
            <span className="hidden md:inline">·</span>
            <span className="hidden md:inline">WORKFLOW.FACTORY</span>
            <span className="hidden md:inline">·</span>
            <span>v1.0</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-4 text-[8px] lg:text-[9px] font-mono text-white/50">
            <span className="hidden lg:inline">◐ INGESTING</span>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-white/60 rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-1 h-1 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
            <span className="hidden lg:inline">FRAME: ∞</span>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="container mx-auto px-4 lg:px-8 py-10 lg:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <div className="font-mono text-white text-lg font-bold tracking-widest italic transform -skew-x-12 inline-block mb-3">
              BOVERSE
            </div>
            <p className="text-[11px] lg:text-xs text-white/50 font-mono leading-relaxed max-w-[200px]">
              Five primitives. Infinite forms. The workflow factory.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-[10px] font-mono text-white/40 tracking-widest mb-3 lg:mb-4">
              PRODUCT
            </h4>
            <ul className="space-y-1.5 lg:space-y-2 text-[11px] lg:text-xs font-mono">
              <li><Link href="/process" className="text-white/70 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">Process</Link></li>
              <li><Link href="/example" className="text-white/70 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">Example</Link></li>
              <li><Link href="/build" className="text-white/70 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">Build Workflow</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[10px] font-mono text-white/40 tracking-widest mb-3 lg:mb-4">
              COMPANY
            </h4>
            <ul className="space-y-1.5 lg:space-y-2 text-[11px] lg:text-xs font-mono">
              <li><Link href="/build" className="text-white/70 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">Build Workflow</Link></li>
              <li><a href="mailto:hello@boverse.ai" className="text-white/70 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:underline underline-offset-4 transition-colors">hello@boverse.ai</a></li>
            </ul>
          </div>

          {/* Stack */}
          <div>
            <h4 className="text-[10px] font-mono text-white/40 tracking-widest mb-3 lg:mb-4">
              STACK
            </h4>
            <ul className="space-y-1.5 lg:space-y-2 text-[11px] lg:text-xs font-mono text-white/70">
              <li>AI SDK · Groq + Gemini</li>
              <li>Next.js 16 on Vercel</li>
              <li>Supabase Postgres + pgvector</li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-10 lg:mt-14 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[10px] font-mono text-white/40 tracking-widest">
          <div>© 2026 BOVERSE · ALL RIGHTS RESERVED</div>
          <div className="flex items-center gap-3">
            <span>∞</span>
            <span>·</span>
            <span>PRIMITIVES</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
