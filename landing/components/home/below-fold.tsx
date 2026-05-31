import Link from "next/link";

const stages = [
  { n: "01", name: "INGEST", desc: "Dump quote, email, voice. AI extracts structure." },
  { n: "02", name: "CLARIFY", desc: "Max 5 targeted questions cover the gaps." },
  { n: "03", name: "SIMULATE", desc: "Schema + 10 synthetic rows with edge cases." },
  { n: "04", name: "GENERATE", desc: "Full workflow: primitives, actors, prompts, RAG." },
  { n: "05", name: "DELIVER", desc: "Word doc spec + executable demo run, one bundle." },
];

const primitives = [
  { name: "INGEST", op: "read → classify → extract" },
  { name: "TRANSFORM", op: "match → score → generate" },
  { name: "VALIDATE", op: "check → approve → gate" },
  { name: "ACTION", op: "format → execute → integrate" },
  { name: "FEEDBACK", op: "monitor → detect → learn" },
];

export default function HomeBelowFold() {
  return (
    <>
      {/* SECTION 01: PROBLEM */}
      <section id="problem" className="relative border-t border-white/10 bg-black scroll-mt-16">
        <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-5xl">
          <div className="flex items-center gap-2 mb-8 lg:mb-12 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">01 / PROBLEM</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-3xl lg:text-6xl font-bold font-mono tracking-wider leading-[1.1] mb-8 lg:mb-12" style={{ letterSpacing: '0.06em' }}>
            YOUR BUSINESS RUNS ON
            <span className="block opacity-90 mt-1 lg:mt-2">ONE PERSON&apos;S INSTINCT.</span>
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 max-w-4xl">
            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed">
              The estimator who has priced jobs for 15 years carries your entire margin logic.
              The operations manager who has scheduled production for a decade knows intuitively
              which jobs to prioritize, which suppliers are unreliable, which customers pay late.
            </p>
            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed">
              That knowledge doesn&apos;t live in any document. It doesn&apos;t survive a resignation.
              It can&apos;t be delegated, scaled, or quality-checked. It almost never gets applied
              consistently.
            </p>
          </div>

          <div className="mt-10 lg:mt-16 inline-block">
            <div className="text-[10px] font-mono text-white/40 tracking-widest mb-2">THE GAP</div>
            <div className="text-2xl lg:text-4xl font-mono font-bold tracking-wider">
              <span className="text-white">3 HRS/QUOTE</span>
              <span className="text-white/40 mx-3 lg:mx-4">→</span>
              <span className="text-white">45 MIN/QUOTE</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 02: METHOD */}
      <section className="relative border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-6xl">
          <div className="flex items-center gap-2 mb-8 lg:mb-12 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">02 / METHOD</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-16 mb-12 lg:mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold font-mono tracking-wider leading-[1.1] lg:col-span-2" style={{ letterSpacing: '0.06em' }}>
              FIVE STAGES
              <span className="block opacity-90 mt-1 lg:mt-2">EVERY WORKFLOW.</span>
            </h2>
            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed self-end">
              You hand us artifacts. The factory does the rest.
              Same five stages, every engagement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            {stages.map((s) => (
              <div key={s.n} className="border border-white/20 p-4 lg:p-5 hover:border-white/40 transition-colors">
                <div className="text-[10px] font-mono text-white/40 tracking-widest mb-3 lg:mb-4">
                  {s.n}
                </div>
                <div className="text-base lg:text-lg font-mono font-bold tracking-widest mb-2 lg:mb-3">
                  {s.name}
                </div>
                <div className="text-[11px] lg:text-xs font-mono text-white/60 leading-relaxed">
                  {s.desc}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 lg:mt-12">
            <Link
              href="/process"
              className="inline-flex items-center gap-2 text-xs lg:text-sm font-mono tracking-widest text-white border-b border-white/40 pb-1 hover:border-white transition-colors"
            >
              SEE THE FULL PROCESS
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* SECTION 03: GRAMMAR */}
      <section className="relative border-t border-white/10 bg-black overflow-hidden">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-white/20"></div>
        <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-white/20"></div>

        <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-5xl">
          <div className="flex items-center gap-2 mb-8 lg:mb-12 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">03 / GRAMMAR</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-3xl lg:text-6xl font-bold font-mono tracking-wider leading-[1.1] mb-8 lg:mb-12" style={{ letterSpacing: '0.06em' }}>
            FIVE PRIMITIVES.
            <span className="block opacity-90 mt-1 lg:mt-2">INFINITE FORMS.</span>
          </h2>

          <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed max-w-3xl mb-10 lg:mb-14">
            A construction estimating workflow and a legal matter-costing workflow
            are the same primitive sequence configured differently. The system builds
            from a fixed grammar. The expertise lives in the configuration.
            Your domain knowledge. Your thresholds. Your exceptions.
          </p>

          {/* Code-style primitive listing */}
          <div className="border border-white/20 bg-black overflow-x-auto">
            <div className="px-4 py-2 border-b border-white/10 text-[10px] font-mono text-white/40 tracking-widest bg-white/[0.02]">
              PRIMITIVE GRAMMAR · v1.0
            </div>
            <div className="divide-y divide-white/5">
              {primitives.map((p, i) => (
                <div key={p.name} className="flex items-center gap-4 lg:gap-6 px-4 py-3 hover:bg-white/[0.02] transition-colors min-w-[480px]">
                  <span className="text-[10px] font-mono text-white/30 tracking-widest w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-sm lg:text-base font-mono font-bold tracking-widest text-white w-32 lg:w-40">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono text-white/30">::</span>
                  <span className="text-xs lg:text-sm font-mono text-white/60">
                    {p.op}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 04: PROOF */}
      <section className="relative border-t border-white/10 bg-white/[0.02]">
        <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-6xl">
          <div className="flex items-center gap-2 mb-8 lg:mb-12 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">04 / PROOF</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <div className="text-[11px] font-mono text-white/40 tracking-widest mb-4">
                THE SMB OPERATING STACK
              </div>

              <h2 className="text-3xl lg:text-5xl font-bold font-mono tracking-wider leading-[1.1] mb-6 lg:mb-8" style={{ letterSpacing: '0.06em' }}>
                EVERY SCALING SMB
                <span className="block opacity-90 mt-1 lg:mt-2">BREAKS THE SAME WAY.</span>
              </h2>

              <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed mb-6 lg:mb-8">
                Fourteen operating layers. Founder oversight. Lead gen. Sales. Scoping. Onboarding. Delivery. Knowledge. Finance. Management cadence. Support. HR. Strategy. Continuous improvement. AI itself.
              </p>
              <p className="text-sm lg:text-base text-white/50 font-mono leading-relaxed mb-8 lg:mb-10">
                Each layer has a recognizable reality, a recognizable tool sprawl, a recognizable friction. The leverage lives in the orchestration runtime that sits across all of them.
              </p>

              <Link
                href="/example"
                className="inline-flex items-center gap-2 text-xs lg:text-sm font-mono tracking-widest text-white border-b border-white/40 pb-1 hover:border-white transition-colors"
              >
                SEE THE FULL STACK
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Operating stack preview card */}
            <div className="border border-white/20 bg-black">
              <div className="px-4 py-2 border-b border-white/10 text-[10px] font-mono text-white/40 tracking-widest bg-white/[0.02] flex items-center justify-between">
                <span>SMB OPERATING STACK · 14 LAYERS</span>
                <span className="text-white/30">L01—L14</span>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { id: "L01", name: "Founder / Executive Oversight", op: "BOTTLENECK" },
                  { id: "L03", name: "Sales Process", op: "INCONSISTENT" },
                  { id: "L06", name: "Delivery / Fulfillment", op: "SILO'D" },
                  { id: "L07", name: "Knowledge & Documentation", op: "TRIBAL" },
                  { id: "L09", name: "Management Cadence", op: "REACTIVE" },
                  { id: "L14", name: "AI / Automation Layer", op: "FRAGMENTED" },
                ].map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-[10px] font-mono text-white/30 tracking-widest w-10 tabular-nums">{row.id}</span>
                    <span className="text-xs font-mono text-white flex-1">{row.name}</span>
                    <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 border border-white/20 text-white/60">
                      {row.op}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-white/10 text-[10px] font-mono text-white/30 tracking-widest text-center">
                + 8 MORE LAYERS · MAPPED IN /EXAMPLE
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05: FINAL CTA */}
      <section className="relative border-t border-white/10 bg-black overflow-hidden">
        {/* Corner accents */}
        <div className="absolute bottom-0 left-0 w-12 h-12 border-b-2 border-l-2 border-white/20"></div>
        <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-white/20"></div>

        <div className="container mx-auto px-6 lg:px-16 py-24 lg:py-40 max-w-5xl text-center">
          <div className="text-[10px] lg:text-[11px] font-mono text-white/40 tracking-widest mb-4 lg:mb-6">
            05 / READY?
          </div>

          <h2 className="text-3xl lg:text-6xl font-bold font-mono tracking-wider leading-[1.1] mb-6 lg:mb-8" style={{ letterSpacing: '0.06em' }}>
            HAND US YOUR ARTIFACTS.
            <span className="block opacity-90 mt-1 lg:mt-2">WE&apos;LL BUILD THE WORKFLOW.</span>
          </h2>

          <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed max-w-xl mx-auto mb-10 lg:mb-12">
            One sample output. One process artifact. One reference data sample.
            That&apos;s enough to start.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
            <Link
              href="/factory"
              className="px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black font-mono text-xs lg:text-sm border border-white hover:bg-transparent hover:text-white transition-all duration-200 tracking-widest"
            >
              BUILD WORKFLOW
            </Link>
            <Link
              href="/process"
              className="px-8 lg:px-10 py-3 lg:py-3.5 bg-transparent border border-white text-white font-mono text-xs lg:text-sm hover:bg-white hover:text-black transition-all duration-200 tracking-widest"
            >
              LEARN MORE →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
