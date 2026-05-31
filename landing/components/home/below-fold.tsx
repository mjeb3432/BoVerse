import Link from "next/link";
import type { ReactNode } from "react";

// Three plain steps — the business-user story, accurate to the two-swarm flow.
const steps = [
  {
    n: "01",
    name: "DESCRIBE",
    desc: "Say what you want, and upload whatever you already have — a few notes, a spreadsheet, a sample of the result.",
  },
  {
    n: "02",
    name: "REVIEW",
    desc: "We show you a sample of the finished work and the inputs behind it. Comment or change anything. Nothing technical to read.",
  },
  {
    n: "03",
    name: "BUILD",
    desc: "Approve, and we build the workflow — only the pieces it actually needs. Yours to run.",
  },
];

function Label({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-8 lg:mb-10 opacity-60">
      <div className="w-8 h-px bg-white" />
      <span className="text-white text-[10px] font-mono tracking-widest">{children}</span>
      <div className="flex-1 h-px bg-white" />
    </div>
  );
}

const HEADLINE =
  "text-3xl lg:text-5xl font-bold font-mono tracking-wider leading-[1.1] mb-6 lg:mb-8";
const BODY = "text-sm lg:text-base text-white/70 font-mono leading-relaxed";

export default function HomeBelowFold() {
  return (
    <>
      {/* WHY */}
      <section className="border-t border-white/10 bg-black">
        <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-3xl">
          <Label>WHY</Label>
          <h2 className={HEADLINE} style={{ letterSpacing: "0.06em" }}>
            YOUR BUSINESS RUNS ON
            <span className="block opacity-90 mt-1 lg:mt-2">ONE PERSON&apos;S INSTINCT.</span>
          </h2>
          <p className={BODY}>
            The person who has priced your jobs for fifteen years carries your whole pricing
            logic in their head. It isn&apos;t written down anywhere. It doesn&apos;t survive a
            resignation, and it rarely gets applied the same way twice.
          </p>
          <p className={`${BODY} mt-6`}>
            BoVerse turns that know-how into a workflow you can actually run — without anyone
            having to design it.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="border-t border-white/10 bg-white/[0.02] scroll-mt-16">
        <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-4xl">
          <Label>HOW IT WORKS</Label>
          <h2 className={HEADLINE} style={{ letterSpacing: "0.06em" }}>
            DESCRIBE IT.
            <span className="block opacity-90 mt-1 lg:mt-2">WE BUILD IT.</span>
          </h2>
          <p className={`${BODY} max-w-2xl mb-12 lg:mb-16`}>
            You never design the workflow yourself. You describe what you want, review a sample,
            and approve. Three steps.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {steps.map((s) => (
              <div key={s.n} className="bg-black p-6 lg:p-8">
                <div className="text-[10px] font-mono text-white/40 tracking-widest mb-4">{s.n}</div>
                <div className="text-lg lg:text-xl font-mono font-bold tracking-widest mb-3">{s.name}</div>
                <p className="text-xs lg:text-sm font-mono text-white/60 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 bg-black">
        <div className="container mx-auto px-6 lg:px-16 py-24 lg:py-36 max-w-3xl text-center">
          <h2 className={`${HEADLINE} mb-6 lg:mb-8`} style={{ letterSpacing: "0.06em" }}>
            HAND US WHAT YOU HAVE.
            <span className="block opacity-90 mt-1 lg:mt-2">WE&apos;LL BUILD THE WORKFLOW.</span>
          </h2>
          <p className={`${BODY} mx-auto max-w-lg mb-10 lg:mb-12`}>
            A sample of the result and a couple of examples is enough to start.
          </p>
          <Link
            href="/factory"
            className="inline-block px-8 lg:px-10 py-3 lg:py-3.5 bg-white text-black font-mono text-xs lg:text-sm border border-white hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200 tracking-widest"
          >
            BUILD WORKFLOW →
          </Link>
        </div>
      </section>
    </>
  );
}
