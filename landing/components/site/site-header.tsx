'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/process', label: 'PROCESS' },
  { href: '/example', label: 'EXAMPLE' },
];

export default function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 left-0 right-0 z-30 border-b border-white/20 bg-black/80 backdrop-blur-md">
      <div className="container mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
        {/* Brand cluster */}
        <Link
          href="/"
          aria-label="BoVerse home"
          className="flex items-center gap-2 lg:gap-4 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          <div className="font-mono text-white text-xl lg:text-2xl font-bold tracking-widest italic transform -skew-x-12 group-hover:opacity-80 transition-opacity">
            BOVERSE
          </div>
          <div className="h-3 lg:h-4 w-px bg-white/40" aria-hidden="true"></div>
          <span className="text-white/60 text-[8px] lg:text-[10px] font-mono">EST. 2026</span>
        </Link>

        {/* Nav + CTA */}
        <div className="flex items-center gap-2 lg:gap-6">
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-2 lg:gap-4 text-[10px] lg:text-[11px] font-mono tracking-widest">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                    isActive ? 'text-white' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/build"
            className="hidden sm:inline-flex px-3 lg:px-4 py-2 lg:py-2.5 border border-white text-white font-mono text-[10px] lg:text-[11px] tracking-widest hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200"
          >
            BUILD WORKFLOW
          </Link>

          {/* Mobile menu */}
          <details className="md:hidden relative">
            <summary
              aria-label="Toggle navigation menu"
              className="list-none cursor-pointer text-white/80 font-mono text-[10px] tracking-widest px-3 py-2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white"
            >
              MENU +
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="absolute right-0 top-full mt-2 w-44 border border-white/20 bg-black/95 backdrop-blur-md py-2 flex flex-col text-[10px] font-mono tracking-widest"
            >
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`px-4 py-3 hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none focus-visible:text-white ${
                      isActive ? 'text-white' : 'text-white/70 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href="/build"
                className="px-4 py-3 text-white border-t border-white/20 mt-1 pt-3 hover:bg-white/5 focus-visible:bg-white/5 focus-visible:outline-none"
              >
                BUILD WORKFLOW →
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
