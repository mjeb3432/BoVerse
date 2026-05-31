'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  useEffect(() => {
    const embedScript = document.createElement('script');
    embedScript.type = 'text/javascript';
    embedScript.textContent = `
      !function(){
        if(!window.UnicornStudio){
          window.UnicornStudio={isInitialized:!1};
          var i=document.createElement("script");
          i.src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.33/dist/unicornStudio.umd.js";
          i.onload=function(){
            window.UnicornStudio.isInitialized||(UnicornStudio.init(),window.UnicornStudio.isInitialized=!0)
          };
          (document.head || document.body).appendChild(i)
        }
      }();
    `;
    document.head.appendChild(embedScript);

    // Add CSS to hide branding elements and crop canvas
    const style = document.createElement('style');
    style.textContent = `
      [data-us-project] {
        position: relative !important;
        overflow: hidden !important;
      }

      [data-us-project] canvas {
        clip-path: inset(0 0 10% 0) !important;
      }

      [data-us-project] * {
        pointer-events: none !important;
      }
      [data-us-project] a[href*="unicorn"],
      [data-us-project] button[title*="unicorn"],
      [data-us-project] div[title*="Made with"],
      [data-us-project] .unicorn-brand,
      [data-us-project] [class*="brand"],
      [data-us-project] [class*="credit"],
      [data-us-project] [class*="watermark"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
      }
    `;
    document.head.appendChild(style);

    // Function to aggressively hide branding
    const hideBranding = () => {
      const projectDiv = document.querySelector('[data-us-project]');
      if (projectDiv) {
        const allElements = projectDiv.querySelectorAll('*');
        allElements.forEach(el => {
          const text = (el.textContent || '').toLowerCase();
          if (text.includes('made with') || text.includes('unicorn')) {
            el.remove();
          }
        });
      }
    };

    hideBranding();
    const interval = setInterval(hideBranding, 100);
    setTimeout(hideBranding, 1000);
    setTimeout(hideBranding, 3000);
    setTimeout(hideBranding, 5000);

    return () => {
      clearInterval(interval);
      document.head.removeChild(embedScript);
      document.head.removeChild(style);
    };
  }, []);

  return (
    <main id="main" className="relative min-h-screen overflow-hidden bg-black">
      {/* Vitruvian man animation - hidden on mobile */}
      <div className="absolute inset-0 w-full h-full hidden lg:block">
        <div
          data-us-project="whwOGlfJ5Rz2rHaEUgHl"
          style={{ width: '100%', height: '100%', minHeight: '100vh' }}
        />
      </div>

      {/* Mobile stars background */}
      <div className="absolute inset-0 w-full h-full lg:hidden stars-bg"></div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 border-b border-white/15 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 lg:px-8 py-3 lg:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="font-mono text-white text-xl lg:text-2xl font-bold tracking-widest italic transform -skew-x-12">
              BOVERSE
            </div>
            <div className="h-3 lg:h-4 w-px bg-white/40"></div>
            <span className="text-white/60 text-[8px] lg:text-[10px] font-mono">EST. 2026</span>
          </div>

          <div className="flex items-center gap-2 lg:gap-5">
            <Link href="/#how" className="hidden md:inline px-2 py-2 text-[10px] lg:text-[11px] font-mono tracking-widest text-white/60 hover:text-white focus-visible:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white transition-colors">
              HOW IT WORKS
            </Link>
            <Link
              href="/factory"
              className="px-3 lg:px-4 py-2 lg:py-2.5 border border-white text-white font-mono text-[10px] lg:text-[11px] tracking-widest hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200"
            >
              BUILD WORKFLOW
            </Link>
          </div>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-6 lg:px-16 lg:ml-[8%]">
          <div className="max-w-lg">
            <h1 className="text-3xl lg:text-6xl font-bold text-white mb-5 lg:mb-6 leading-tight font-mono tracking-wider" style={{ letterSpacing: '0.08em' }}>
              ATOMIC
              <span className="block text-white mt-1 lg:mt-2 opacity-90">WORKFLOWS</span>
            </h1>

            <p className="text-sm lg:text-lg text-white/70 mb-8 lg:mb-10 leading-relaxed font-mono max-w-md">
              Describe the outcome you want and upload what you already have. BoVerse builds the
              workflow for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
              <Link
                href="/factory"
                className="inline-block px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black font-mono text-xs lg:text-sm border border-white hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200 tracking-widest"
              >
                BUILD WORKFLOW →
              </Link>
              <a
                href="#how"
                className="inline-block px-6 lg:px-8 py-2.5 lg:py-3 bg-transparent border border-white text-white font-mono text-xs lg:text-sm hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200 tracking-widest"
              >
                HOW IT WORKS
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .stars-bg {
          background-image:
            radial-gradient(1px 1px at 20% 30%, white, transparent),
            radial-gradient(1px 1px at 60% 70%, white, transparent),
            radial-gradient(1px 1px at 50% 50%, white, transparent),
            radial-gradient(1px 1px at 80% 10%, white, transparent),
            radial-gradient(1px 1px at 90% 60%, white, transparent),
            radial-gradient(1px 1px at 33% 80%, white, transparent),
            radial-gradient(1px 1px at 15% 60%, white, transparent),
            radial-gradient(1px 1px at 70% 40%, white, transparent);
          background-size: 200% 200%, 180% 180%, 250% 250%, 220% 220%, 190% 190%, 240% 240%, 210% 210%, 230% 230%;
          background-position: 0% 0%, 40% 40%, 60% 60%, 20% 20%, 80% 80%, 30% 30%, 70% 70%, 50% 50%;
          opacity: 0.3;
        }
      `}</style>
    </main>
  );
}
