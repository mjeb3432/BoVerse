import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import Link from "next/link";

const stages = [
  {
    n: "01",
    name: "DUMP & INGEST",
    primitive: "INGEST",
    actor: "HYBRID",
    model: "SONNET",
    summary: "Upload anything. A sample quote. An email thread. A spreadsheet. A voice note. AI classifies, extracts structure, and reasons backwards from your output artifacts to inferred inputs, decisions, and embedded domain knowledge.",
    outputs: ["Structured JSON per material", "Inferred steps", "Implied rules", "Confidence scoring per item"],
  },
  {
    n: "02",
    name: "TARGETED CLARIFICATION",
    primitive: "VALIDATE",
    actor: "HYBRID",
    model: "SONNET",
    summary: "AI produces a summary of what it inferred, then asks a maximum of 5 targeted questions covering only what it couldn't infer. No open-ended interviews. No forms. Just the questions whose answers drive a specific architectural decision downstream.",
    outputs: ["≤5 targeted questions", "Realistic placeholder answers", "Gap categorization"],
  },
  {
    n: "03",
    name: "SIMULATION PACK",
    primitive: "TRANSFORM",
    actor: "HYBRID",
    model: "SONNET",
    summary: "AI proposes the input contract schema. Team confirms. AI generates 10 synthetic rows including 3 intentional edge cases: missing fields, duplicate values, ambiguous dates, out-of-range numbers. The schema becomes the swap interface for real batch data.",
    outputs: ["Input contract schema", "10 synthetic rows", "3 deliberate edge cases", "Regression test suite"],
  },
  {
    n: "04",
    name: "WORKFLOW GENERATION",
    primitive: "TRANSFORM",
    actor: "AUTO",
    model: "SONNET",
    summary: "AI designs the complete workflow: primitive sequence, execution actor per step, model selection per step, prompt chain and branching logic, RAG library specification with gaps flagged, code requirements, integration points marked batch-first.",
    outputs: ["Primitive sequence", "Actor + model per step", "Prompt chain", "RAG library spec"],
  },
  {
    n: "05",
    name: "OUTPUT BUNDLE",
    primitive: "ACTION",
    actor: "AUTO",
    model: "SONNET",
    summary: "Two deliverables simultaneously. A plain-English Word doc spec the team walks the client through. A simulated demo run, the workflow executed against the synthetic dataset including edge case handling. Both delivered as one bundle.",
    outputs: ["Word doc specification", "Executable simulation", "Edge case demo runs", "Swap interface marker"],
  },
];

const primitives = [
  { name: "INGEST", desc: "Read and make sense of unstructured material" },
  { name: "TRANSFORM", desc: "Change shape or add meaning to structured data" },
  { name: "VALIDATE", desc: "Check against rules, surface exceptions, gatekeep" },
  { name: "ACTION", desc: "Something happens in the world" },
  { name: "FEEDBACK", desc: "Workflow watches itself, detects drift, learns" },
];

export default function ProcessPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <main id="main" className="relative">
        {/* Page hero */}
        <section className="relative border-b border-white/10 overflow-hidden">
          {/* Corner frame accents */}
          <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
          <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>

          <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-5xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">PROCESS</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h1 className="text-4xl lg:text-7xl font-bold font-mono tracking-wider leading-[1.05] mb-6 lg:mb-8" style={{ letterSpacing: '0.08em' }}>
              FIVE STAGES
              <span className="block opacity-90 mt-1 lg:mt-2">FROM ARTIFACTS</span>
              <span className="block opacity-80 mt-1 lg:mt-2">TO WORKFLOWS</span>
            </h1>

            <p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed max-w-2xl">
              Every workflow runs through the same five stages. The primitive grammar is universal.
              The configuration is yours.
            </p>
          </div>
        </section>

        {/* Stages */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-5xl">
          <div className="space-y-12 lg:space-y-20">
            {stages.map((stage, i) => (
              <article key={stage.n} className="relative group">
                {/* Stage number + connector line */}
                <div className="flex flex-col md:flex-row gap-6 lg:gap-12">
                  {/* Left: number */}
                  <div className="md:w-24 lg:w-32 shrink-0 flex md:flex-col items-center md:items-start gap-3 md:gap-2">
                    <div className="text-5xl lg:text-7xl font-mono font-bold text-white/90 tracking-wider leading-none">
                      {stage.n}
                    </div>
                    {i < stages.length - 1 && (
                      <div className="hidden md:block w-px h-32 bg-white/10 mt-4"></div>
                    )}
                  </div>

                  {/* Right: content */}
                  <div className="flex-1 min-w-0">
                    {/* Metadata row */}
                    <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-3 lg:mb-4 text-[9px] lg:text-[10px] font-mono text-white/40 tracking-widest">
                      <span className="px-2 py-1 border border-white/20">PRIMITIVE · {stage.primitive}</span>
                      <span className="px-2 py-1 border border-white/20">ACTOR · {stage.actor}</span>
                      <span className="px-2 py-1 border border-white/20">MODEL · {stage.model}</span>
                    </div>

                    <h2 className="text-2xl lg:text-3xl font-mono font-bold tracking-wider mb-4 lg:mb-5" style={{ letterSpacing: '0.05em' }}>
                      {stage.name}
                    </h2>

                    <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed mb-5 lg:mb-6">
                      {stage.summary}
                    </p>

                    {/* Outputs grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stage.outputs.map((output) => (
                        <div key={output} className="flex items-center gap-2 text-[11px] lg:text-xs font-mono text-white/60">
                          <span className="text-white/30">→</span>
                          <span>{output}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Primitive grammar callout */}
        <section className="border-t border-white/10 bg-white/[0.02]">
          <div className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-5xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">THE GRAMMAR</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h2 className="text-2xl lg:text-4xl font-mono font-bold tracking-wider leading-tight mb-6 lg:mb-8" style={{ letterSpacing: '0.05em' }}>
              FIVE PRIMITIVES.
              <span className="block opacity-80">INFINITE FORMS.</span>
            </h2>

            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed max-w-3xl mb-10 lg:mb-12">
              A construction estimating workflow and a legal matter-costing workflow are the same primitive
              sequence configured differently. The system builds from a fixed grammar. The expertise lives
              in the configuration. Your domain knowledge. Your thresholds. Your exceptions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
              {primitives.map((p) => (
                <div key={p.name} className="border border-white/20 p-4 lg:p-5 hover:border-white/40 transition-colors">
                  <div className="text-[11px] lg:text-xs font-mono font-bold tracking-widest mb-2 lg:mb-3">
                    {p.name}
                  </div>
                  <div className="text-[11px] lg:text-xs font-mono text-white/60 leading-relaxed">
                    {p.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 lg:px-16 py-20 lg:py-28 max-w-5xl text-center">
          <p className="text-[10px] lg:text-[11px] font-mono text-white/40 tracking-widest mb-4">
            READY TO START
          </p>
          <h2 className="text-2xl lg:text-4xl font-mono font-bold tracking-wider leading-tight mb-8 lg:mb-10" style={{ letterSpacing: '0.05em' }}>
            HAND US YOUR ARTIFACTS.
            <span className="block opacity-80">WE&apos;LL BUILD THE WORKFLOW.</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
            <Link
              href="/factory"
              className="relative px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black font-mono text-xs lg:text-sm border border-white hover:bg-transparent hover:text-white transition-all duration-200 tracking-widest"
            >
              BUILD WORKFLOW
            </Link>
            <Link
              href="/example"
              className="relative px-6 lg:px-8 py-2.5 lg:py-3 bg-transparent border border-white text-white font-mono text-xs lg:text-sm hover:bg-white hover:text-black transition-all duration-200 tracking-widest"
            >
              SEE EXAMPLE →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
