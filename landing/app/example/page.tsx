import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import Link from "next/link";

const businessMeta = [
  { label: "REVENUE", value: "$8-12M" },
  { label: "TEAM", value: "12 ESTIMATORS" },
  { label: "STACK", value: "QB · SERVICETITAN · EXCEL" },
  { label: "VOLUME", value: "15-25 QUOTES/WK" },
  { label: "BEFORE", value: "3 HRS/QUOTE" },
  { label: "AFTER", value: "45 MIN/QUOTE" },
];

const workflowMap = [
  {
    stage: "01 INGESTION",
    color: "text-white/90",
    steps: [
      { id: "1.1", name: "Inquiry capture", actor: "AUTO", model: "HAIKU" },
      { id: "1.2", name: "Client history lookup", actor: "AUTO", model: "HAIKU" },
      { id: "1.3", name: "Job type classification", actor: "AUTO", model: "HAIKU" },
    ],
  },
  {
    stage: "02 TRANSFORMATION",
    color: "text-white/90",
    steps: [
      { id: "2.1", name: "Scope extraction", actor: "AUTO", model: "SONNET" },
      { id: "2.2", name: "Labour hour calculation", actor: "AUTO", model: "SONNET" },
      { id: "2.3", name: "Materials costing", actor: "AUTO", model: "HAIKU" },
      { id: "2.4", name: "Margin and markup", actor: "AUTO", model: "HAIKU" },
      { id: "2.5", name: "Quote narrative", actor: "AUTO", model: "SONNET" },
    ],
  },
  {
    stage: "03 VALIDATION",
    color: "text-white/90",
    steps: [
      { id: "3.1", name: "Rules validation", actor: "AUTO", model: "HAIKU" },
      { id: "3.2", name: "Estimator review · failed", actor: "HUMAN", model: "—" },
      { id: "3.3", name: "Value threshold check", actor: "AUTO", model: "HAIKU" },
      { id: "3.4", name: "Senior estimator review", actor: "HUMAN", model: "—" },
      { id: "3.5", name: "Pre-dispatch review", actor: "HUMAN", model: "—" },
    ],
  },
  {
    stage: "04 ACTION",
    color: "text-white/90",
    steps: [
      { id: "4.1", name: "Quote PDF generation", actor: "AUTO", model: "HAIKU" },
      { id: "4.2", name: "Quote dispatch", actor: "AUTO", model: "HAIKU" },
      { id: "4.3", name: "QuickBooks + log update", actor: "AUTO", model: "HAIKU" },
    ],
  },
  {
    stage: "05 FEEDBACK",
    color: "text-white/90",
    steps: [
      { id: "5.1", name: "Win/loss tracking", actor: "AUTO", model: "HAIKU" },
      { id: "5.2", name: "Weekly accuracy report", actor: "AUTO", model: "SONNET" },
      { id: "5.3", name: "Rate table update trigger", actor: "HYBRID", model: "SONNET" },
    ],
  },
];

const ragAssets = [
  { name: "Labour rate table", type: "PRICING", status: "PROVIDED" },
  { name: "Material price list", type: "PRICING", status: "PROVIDED" },
  { name: "Margin rules", type: "RULES", status: "NEEDS CAPTURE" },
  { name: "Validation rules", type: "RULES", status: "NEEDS CAPTURE" },
  { name: "Client tier registry", type: "REGISTRY", status: "PROVIDED" },
  { name: "Job taxonomy", type: "WIKI", status: "INFERRED" },
  { name: "Sample quotes · 5 approved", type: "EXAMPLES", status: "PROVIDED" },
  { name: "Complexity multipliers", type: "RULES", status: "NEEDS CAPTURE" },
];

const syntheticRows = [
  { id: "APX-2025-001", client: "Greenfield Homes", job: "New build · 4BR residential", flag: null },
  { id: "APX-2025-002", client: "Parkview Medical Centre", job: "Commercial · consulting suite", flag: null },
  { id: "APX-2025-003", client: "R. and T. Mallory", job: "Reno · heritage rewire", flag: null },
  { id: "APX-2025-008", client: "Rivera Constructions", job: "Commercial fit-out", flag: "MISSING FIELD" },
  { id: "APX-2025-009", client: "Greenfield Homes", job: "New build · 4BR residential", flag: "DUPLICATE" },
  { id: "APX-2025-010", client: "Metro Retail Group", job: "12 stores · staged · TBC", flag: "AMBIGUOUS SCOPE" },
];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "PROVIDED"
      ? "border-white/40 text-white/80"
      : status === "INFERRED"
      ? "border-yellow-400/40 text-yellow-400/80"
      : "border-orange-400/40 text-orange-400/80";
  return (
    <span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 border ${color}`}>
      {status}
    </span>
  );
}

export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <main id="main" className="relative">
        {/* Page hero */}
        <section className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
          <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>

          <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-6xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">EXAMPLE · 001</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h1 className="text-4xl lg:text-7xl font-bold font-mono tracking-wider leading-[1.05] mb-6 lg:mb-8" style={{ letterSpacing: '0.08em' }}>
              APEX ELECTRICAL
              <span className="block text-2xl lg:text-4xl opacity-70 mt-3 lg:mt-4 font-normal">Job estimating workflow</span>
            </h1>

            <p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed max-w-2xl mb-10 lg:mb-12">
              A commercial and residential electrical contractor. 12 estimators. Three hours per quote.
              BoVerse turned the estimating manager&apos;s head into a workflow. Now: 45 minutes per quote.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
              {businessMeta.map((m) => (
                <div key={m.label} className="border-l border-white/20 pl-3 lg:pl-4">
                  <div className="text-[9px] font-mono text-white/40 tracking-widest mb-1">{m.label}</div>
                  <div className="text-xs lg:text-sm font-mono text-white">{m.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow map */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-6xl">
          <div className="flex items-center gap-2 mb-6 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">WORKFLOW MAP · 22 STEPS</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-2xl lg:text-4xl font-mono font-bold tracking-wider mb-3 lg:mb-4" style={{ letterSpacing: '0.05em' }}>
            EVERY STEP, EXPLICIT
          </h2>
          <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed mb-10 lg:mb-12 max-w-3xl">
            What the AI does. What the human reviews. What model runs it. No black boxes.
            Every primitive labeled. Every actor named.
          </p>

          <div className="space-y-8 lg:space-y-10">
            {workflowMap.map((stage) => (
              <div key={stage.stage}>
                <div className={`text-[11px] lg:text-xs font-mono font-bold tracking-widest mb-3 lg:mb-4 ${stage.color}`}>
                  {stage.stage}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 lg:gap-3">
                  {stage.steps.map((step) => (
                    <div key={step.id} className="border border-white/15 hover:border-white/30 transition-colors p-3 lg:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono text-white/40 tracking-widest">{step.id}</span>
                        <div className="flex gap-1.5">
                          <span className={`text-[9px] font-mono tracking-widest px-1.5 py-0.5 border ${step.actor === 'HUMAN' ? 'border-orange-400/40 text-orange-400/80' : step.actor === 'HYBRID' ? 'border-yellow-400/40 text-yellow-400/80' : 'border-white/20 text-white/60'}`}>
                            {step.actor}
                          </span>
                          <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 border border-white/20 text-white/60">
                            {step.model}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs lg:text-sm font-mono text-white">{step.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* RAG library */}
        <section className="border-t border-white/10 bg-white/[0.02]">
          <div className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-6xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">KNOWLEDGE LIBRARY</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h2 className="text-2xl lg:text-4xl font-mono font-bold tracking-wider mb-3 lg:mb-4" style={{ letterSpacing: '0.05em' }}>
              TRIBAL KNOWLEDGE, MADE EXPLICIT
            </h2>
            <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed mb-10 lg:mb-12 max-w-3xl">
              The rules that lived in the estimating manager&apos;s head. Now in the system.
              Three statuses: provided by the client, inferred from artifacts, or flagged for capture.
            </p>

            <div className="border border-white/20">
              <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-white/10 text-[10px] font-mono text-white/40 tracking-widest bg-white/[0.02]">
                <div className="col-span-6 md:col-span-7">ASSET</div>
                <div className="col-span-3 md:col-span-2">TYPE</div>
                <div className="col-span-3">STATUS</div>
              </div>
              {ragAssets.map((asset) => (
                <div key={asset.name} className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors items-center">
                  <div className="col-span-6 md:col-span-7 text-xs lg:text-sm font-mono text-white">{asset.name}</div>
                  <div className="col-span-3 md:col-span-2 text-[10px] font-mono text-white/50 tracking-widest">{asset.type}</div>
                  <div className="col-span-3">
                    <StatusBadge status={asset.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Synthetic data */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-6xl">
          <div className="flex items-center gap-2 mb-6 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">SIMULATION PACK · 10 ROWS</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-2xl lg:text-4xl font-mono font-bold tracking-wider mb-3 lg:mb-4" style={{ letterSpacing: '0.05em' }}>
            7 HAPPY · 3 EDGE CASES
          </h2>
          <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed mb-10 lg:mb-12 max-w-3xl">
            Realistic synthetic data that looks like a real week of Apex. Three rows are deliberately
            broken: missing fields, duplicates, ambiguous scopes. The workflow handles each gracefully
            before a single real quote touches the system.
          </p>

          <div className="border border-white/20 overflow-x-auto">
            <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-white/10 text-[10px] font-mono text-white/40 tracking-widest bg-white/[0.02] min-w-[700px]">
              <div className="col-span-3">INQUIRY ID</div>
              <div className="col-span-3">CLIENT</div>
              <div className="col-span-4">JOB</div>
              <div className="col-span-2">EDGE CASE</div>
            </div>
            {syntheticRows.map((row) => (
              <div key={row.id} className={`grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 min-w-[700px] items-center ${row.flag ? 'bg-orange-500/[0.04]' : ''}`}>
                <div className="col-span-3 text-xs font-mono text-white/70">{row.id}</div>
                <div className="col-span-3 text-xs font-mono text-white">{row.client}</div>
                <div className="col-span-4 text-xs font-mono text-white/60">{row.job}</div>
                <div className="col-span-2">
                  {row.flag && (
                    <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 border border-orange-400/40 text-orange-400/80">
                      {row.flag}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 lg:px-16 py-20 lg:py-28 max-w-5xl text-center">
          <p className="text-[10px] lg:text-[11px] font-mono text-white/40 tracking-widest mb-4">
            YOUR WORKFLOW NEXT
          </p>
          <h2 className="text-2xl lg:text-4xl font-mono font-bold tracking-wider leading-tight mb-8 lg:mb-10" style={{ letterSpacing: '0.05em' }}>
            EVERY BUSINESS HAS A WORKFLOW.
            <span className="block opacity-80">YOURS IS A CONFIGURATION AWAY.</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center">
            <Link
              href="/contact"
              className="relative px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black font-mono text-xs lg:text-sm border border-white hover:bg-transparent hover:text-white transition-all duration-200 tracking-widest"
            >
              BUILD WORKFLOW
            </Link>
            <Link
              href="/process"
              className="relative px-6 lg:px-8 py-2.5 lg:py-3 bg-transparent border border-white text-white font-mono text-xs lg:text-sm hover:bg-white hover:text-black transition-all duration-200 tracking-widest"
            >
              ← THE PROCESS
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
