import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <main id="main" className="relative">
        {/* Page hero */}
        <section className="relative border-b border-white/10 overflow-hidden">
          {/* Corner frame accents */}
          <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
          <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-l-2 border-white/20"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-b-2 border-r-2 border-white/20"></div>

          <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-5xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">ERROR · 404</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h1 className="text-5xl lg:text-8xl font-bold font-mono tracking-wider leading-[1.05] mb-6 lg:mb-8" style={{ letterSpacing: '0.08em' }}>
              NOT FOUND
              <span className="block opacity-50 mt-2 lg:mt-3 text-3xl lg:text-5xl">ROUTE.UNRESOLVED</span>
            </h1>

            <p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed max-w-2xl mb-8 lg:mb-10">
              The workflow you&apos;re looking for doesn&apos;t exist at this path.
              Either the URL is wrong, the page was moved, or it was never here in the first place.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200"
              >
                ← BACK TO HOME
              </Link>
              <Link
                href="/factory"
                className="inline-flex items-center justify-center px-6 lg:px-8 py-3 lg:py-4 border-2 border-white/30 text-white font-mono text-xs lg:text-sm tracking-widest hover:border-white focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200"
              >
                BUILD WORKFLOW →
              </Link>
            </div>
          </div>
        </section>

        {/* Diagnostic chrome strip */}
        <section className="border-b border-white/10 bg-black">
          <div className="container mx-auto px-6 lg:px-16 py-6 lg:py-8 max-w-5xl">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-12 font-mono text-[10px] lg:text-xs">
              <div>
                <div className="text-white/40 tracking-widest mb-2">STATUS</div>
                <div className="text-white">404 · NOT FOUND</div>
              </div>
              <div>
                <div className="text-white/40 tracking-widest mb-2">ROUTE</div>
                <div className="text-white">UNRESOLVED</div>
              </div>
              <div>
                <div className="text-white/40 tracking-widest mb-2">SYSTEM</div>
                <div className="text-white">OPERATIONAL</div>
              </div>
              <div>
                <div className="text-white/40 tracking-widest mb-2">ACTION</div>
                <div className="text-white">RETURN TO INDEX</div>
              </div>
            </div>
          </div>
        </section>

        {/* Available routes */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-5xl">
          <div className="flex items-center gap-2 mb-8 lg:mb-10 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">AVAILABLE ROUTES</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <ul className="space-y-3 lg:space-y-4 font-mono">
            <li>
              <Link
                href="/"
                className="group flex items-baseline gap-4 lg:gap-6 py-3 lg:py-4 border-b border-white/10 hover:border-white/40 focus-visible:border-white focus-visible:outline-none transition-colors"
              >
                <span className="text-white/40 text-xs lg:text-sm w-12 lg:w-16 shrink-0">001</span>
                <span className="text-white text-base lg:text-xl tracking-wide group-hover:text-white">/</span>
                <span className="text-white/50 text-xs lg:text-sm flex-1">Home · atomic workflows</span>
                <span className="text-white/40 group-hover:text-white transition-colors">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/process"
                className="group flex items-baseline gap-4 lg:gap-6 py-3 lg:py-4 border-b border-white/10 hover:border-white/40 focus-visible:border-white focus-visible:outline-none transition-colors"
              >
                <span className="text-white/40 text-xs lg:text-sm w-12 lg:w-16 shrink-0">002</span>
                <span className="text-white text-base lg:text-xl tracking-wide">/process</span>
                <span className="text-white/50 text-xs lg:text-sm flex-1">Five stages from artifacts to workflows</span>
                <span className="text-white/40 group-hover:text-white transition-colors">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/example"
                className="group flex items-baseline gap-4 lg:gap-6 py-3 lg:py-4 border-b border-white/10 hover:border-white/40 focus-visible:border-white focus-visible:outline-none transition-colors"
              >
                <span className="text-white/40 text-xs lg:text-sm w-12 lg:w-16 shrink-0">003</span>
                <span className="text-white text-base lg:text-xl tracking-wide">/example</span>
                <span className="text-white/50 text-xs lg:text-sm flex-1">Apex Electrical · worked example</span>
                <span className="text-white/40 group-hover:text-white transition-colors">→</span>
              </Link>
            </li>
            <li>
              <Link
                href="/factory"
                className="group flex items-baseline gap-4 lg:gap-6 py-3 lg:py-4 border-b border-white/10 hover:border-white/40 focus-visible:border-white focus-visible:outline-none transition-colors"
              >
                <span className="text-white/40 text-xs lg:text-sm w-12 lg:w-16 shrink-0">004</span>
                <span className="text-white text-base lg:text-xl tracking-wide">/build</span>
                <span className="text-white/50 text-xs lg:text-sm flex-1">Build workflow · generator</span>
                <span className="text-white/40 group-hover:text-white transition-colors">→</span>
              </Link>
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
