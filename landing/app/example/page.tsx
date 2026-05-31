import SiteHeader from "@/components/site/site-header";
import SiteFooter from "@/components/site/site-footer";
import Link from "next/link";

// ────────────────────────────────────────────────────────────────────────────
// SMB Operating Stack — the generalized operating anatomy of a scaling SMB.
// Every row is a recognizable layer. Each layer has a typical reality, a
// typical tool sprawl, a typical friction, and a place where intelligence
// and orchestration create leverage.
// ────────────────────────────────────────────────────────────────────────────

const operatingStack = [
  {
    n: "L01",
    layer: "Founder / Executive Oversight",
    reality: "Founder acts as central coordinator, escalation point, and institutional memory.",
    sprawl: "Email · Slack · spreadsheets · phone · meetings",
    friction: "Founder bottleneck · decisions trapped in conversations · unclear priorities · reactive management",
    opportunity: "Founder dependency mapping · operational visibility · escalation orchestration · institutional memory",
  },
  {
    n: "L02",
    layer: "Lead Generation",
    reality: "Multiple fragmented marketing channels with inconsistent attribution.",
    sprawl: "CRM · Meta · LinkedIn · Google Ads · Klaviyo · HubSpot",
    friction: "Attribution confusion · inconsistent lead quality · disconnected campaigns",
    opportunity: "Lead intelligence · channel orchestration · campaign insight · whitespace detection",
  },
  {
    n: "L03",
    layer: "Sales Process",
    reality: "Relationship-driven and inconsistent across reps.",
    sprawl: "CRM · email · docs · proposals · Slack",
    friction: "Follow-up inconsistency · proposal drift · pricing inconsistency · tribal sales knowledge",
    opportunity: "Sales orchestration · proposal intelligence · pricing consistency · follow-up automation",
  },
  {
    n: "L04",
    layer: "Proposal / Scoping",
    reality: "Scope often lives in emails and meetings, not in canonical objects.",
    sprawl: "Docs · Notion · Slack · spreadsheets",
    friction: "Scope ambiguity · delivery assumptions lost · poor handoff to operations",
    opportunity: "Canonical scope objects · delivery alignment · risk detection",
  },
  {
    n: "L05",
    layer: "Client / Customer Onboarding",
    reality: "Highly manual cross-functional coordination.",
    sprawl: "Email · Asana · Slack · forms · spreadsheets",
    friction: "Missing information · delays · unclear ownership · onboarding inconsistency",
    opportunity: "Readiness orchestration · dependency tracking · intake workflows",
  },
  {
    n: "L06",
    layer: "Delivery / Fulfillment",
    reality: "Cross-functional coordination across siloed tools and teams.",
    sprawl: "PM tools · email · Slack · spreadsheets · industry tools",
    friction: "Missed handoffs · unclear ownership · duplicated work · status confusion",
    opportunity: "Operational orchestration layer · canonical project state",
  },
  {
    n: "L07",
    layer: "Knowledge & Documentation",
    reality: "Tribal knowledge dominates; SOPs drift from practice.",
    sprawl: "Shared drives · Notion · Google Docs",
    friction: "Knowledge loss · inconsistent execution · onboarding friction",
    opportunity: "Institutional memory · workflow wiki · tacit knowledge extraction",
  },
  {
    n: "L08",
    layer: "Financial Operations",
    reality: "Finance disconnected from operational reality.",
    sprawl: "QuickBooks · Excel · ERP · banking",
    friction: "Margin leakage · delayed visibility · reconciliation pain",
    opportunity: "Operational economics layer · reconciliation intelligence",
  },
  {
    n: "L09",
    layer: "Management Cadence",
    reality: "Meetings and reporting inconsistent across functions.",
    sprawl: "Spreadsheets · decks · email",
    friction: "Weak accountability · reactive management · KPI inconsistency",
    opportunity: "Operating rhythm orchestration · scorecards · management systems",
  },
  {
    n: "L10",
    layer: "Customer Support / Success",
    reality: "Reactive support model with fragmented context.",
    sprawl: "Helpdesk · email · Slack",
    friction: "Issues fragmented · poor escalation · no pattern learning",
    opportunity: "Support orchestration · pattern detection · escalation routing",
  },
  {
    n: "L11",
    layer: "HR / Staffing / Training",
    reality: "Hiring and onboarding highly manual and unstructured.",
    sprawl: "HRIS · docs · email",
    friction: "Long ramp-up times · inconsistent training · weak role clarity",
    opportunity: "Training intelligence · SOP generation · workflow learning",
  },
  {
    n: "L12",
    layer: "Strategic Planning",
    reality: "Founder intuition dominates; forecasting is informal.",
    sprawl: "Spreadsheets · PowerPoints · meetings",
    friction: "Weak forecasting · hidden opportunities · reactive strategy",
    opportunity: "Reflection layer · adjacency detection · bottleneck intelligence",
  },
  {
    n: "L13",
    layer: "Continuous Improvement",
    reality: "Improvement dependent on heroic employees noticing.",
    sprawl: "Informal conversations · tribal memory",
    friction: "Lessons learned never systematized",
    opportunity: "Innovation → quantification → orchestration loop",
  },
  {
    n: "L14",
    layer: "AI / Automation Layer",
    reality: "Random disconnected AI experiments lacking governance.",
    sprawl: "ChatGPT · Claude · Zapier · point copilots",
    friction: "AI silos · inconsistent governance · workflow fragmentation",
    opportunity: "Unified orchestration runtime · deterministic + probabilistic routing",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// What Happens As SMBs Scale — the operating stack stays the same, but
// different layers break at different revenue stages. Operational maturity
// is the new ladder.
// ────────────────────────────────────────────────────────────────────────────

const scaleStages = [
  {
    stage: "< $1M",
    symptoms: "Founder does everything.",
    constraint: "Sales consistency",
    breaks: "Capacity",
  },
  {
    stage: "$1 – 3M",
    symptoms: "Early team forms; founder begins to delegate.",
    constraint: "Delegation",
    breaks: "Quality consistency",
  },
  {
    stage: "$3 – 5M",
    symptoms: "Functional silos emerge between sales, ops, finance.",
    constraint: "Coordination",
    breaks: "Communication",
  },
  {
    stage: "$5 – 10M",
    symptoms: "Middle management strain; founder still operates as escalation point.",
    constraint: "Operational orchestration",
    breaks: "Visibility / accountability",
  },
  {
    stage: "$10 – 25M",
    symptoms: "Process complexity rises; tribal knowledge starts breaking.",
    constraint: "Institutional memory",
    breaks: "Cross-functional alignment",
  },
  {
    stage: "$25M +",
    symptoms: "Systems fragmentation across business units.",
    constraint: "Strategic coordination",
    breaks: "Organizational agility",
  },
];

export default function ExamplePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteHeader />

      <main id="main" className="relative">
        {/* Page hero */}
        <section className="relative border-b border-white/10 overflow-hidden">
          <div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
          <div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>

          <div className="container mx-auto px-6 lg:px-16 py-20 lg:py-32 max-w-7xl">
            <div className="flex items-center gap-2 mb-6 opacity-60">
              <div className="w-8 h-px bg-white"></div>
              <span className="text-white text-[10px] font-mono tracking-wider">OPERATING STACK · 001</span>
              <div className="flex-1 h-px bg-white"></div>
            </div>

            <h1 className="text-4xl lg:text-7xl font-bold font-mono tracking-wider leading-[1.05] mb-6 lg:mb-8" style={{ letterSpacing: '0.06em' }}>
              OPERATING ANATOMY
              <span className="block opacity-90 mt-1 lg:mt-2">OF A SCALING SMB</span>
            </h1>

            <p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed max-w-3xl mb-6">
              We&apos;re not selling AI features. We&apos;re mapping and orchestrating the operating anatomy of a modern SMB — the fragmented workflows, silo&apos;d tools, missing handoffs, tacit knowledge, approvals, operational memory, and coordination friction that every scaling business hits.
            </p>
            <p className="text-sm lg:text-lg text-white/50 font-mono leading-relaxed max-w-3xl">
              The same stack repeats across verticals. The same layers break at the same revenue stages. The leverage lives in the orchestration runtime that sits across all of them.
            </p>
          </div>
        </section>

        {/* TABLE 01 — SMB Operating Stack */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-7xl">
          <div className="flex items-center gap-2 mb-4 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">01 / SMB OPERATING STACK</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-4 lg:mb-6" style={{ letterSpacing: '0.04em' }}>
            FOURTEEN LAYERS. ONE OPERATING SYSTEM.
          </h2>

          <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl mb-10 lg:mb-14">
            Every scaling SMB has the same operating layers. Each has a recognizable reality, a recognizable tool sprawl, and a recognizable friction. The intelligence and orchestration opportunity is the rightmost column.
          </p>

          {/* Desktop table */}
          <div className="hidden lg:block border border-white/10 overflow-hidden">
            <table className="w-full font-mono text-xs">
              <thead className="bg-white/[0.03]">
                <tr className="text-left text-white/40 tracking-widest text-[10px]">
                  <th className="px-4 py-4 font-normal w-[60px]">#</th>
                  <th className="px-4 py-4 font-normal w-[18%]">OPERATING LAYER</th>
                  <th className="px-4 py-4 font-normal w-[22%]">TYPICAL SMB REALITY</th>
                  <th className="px-4 py-4 font-normal w-[18%]">COMMON TOOL SPRAWL</th>
                  <th className="px-4 py-4 font-normal w-[22%]">TYPICAL FRICTIONS</th>
                  <th className="px-4 py-4 font-normal">BOVERSE OPPORTUNITY</th>
                </tr>
              </thead>
              <tbody>
                {operatingStack.map((row, i) => (
                  <tr
                    key={row.n}
                    className={`border-t border-white/10 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}`}
                  >
                    <td className="px-4 py-5 align-top text-white/40 tabular-nums">{row.n}</td>
                    <td className="px-4 py-5 align-top text-white font-bold tracking-wide">{row.layer}</td>
                    <td className="px-4 py-5 align-top text-white/70 leading-relaxed">{row.reality}</td>
                    <td className="px-4 py-5 align-top text-white/50 leading-relaxed">{row.sprawl}</td>
                    <td className="px-4 py-5 align-top text-white/60 leading-relaxed">{row.friction}</td>
                    <td className="px-4 py-5 align-top text-white/80 leading-relaxed border-l border-white/10">{row.opportunity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden space-y-4">
            {operatingStack.map((row) => (
              <article key={row.n} className="border border-white/10 p-5 font-mono text-xs">
                <div className="flex items-baseline gap-3 mb-3 pb-3 border-b border-white/10">
                  <span className="text-white/40 tabular-nums text-[10px] tracking-widest">{row.n}</span>
                  <h3 className="text-white font-bold tracking-wide text-sm leading-tight">{row.layer}</h3>
                </div>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">REALITY</dt>
                    <dd className="text-white/70 leading-relaxed">{row.reality}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">TOOL SPRAWL</dt>
                    <dd className="text-white/50 leading-relaxed">{row.sprawl}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">FRICTION</dt>
                    <dd className="text-white/60 leading-relaxed">{row.friction}</dd>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">BOVERSE OPPORTUNITY</dt>
                    <dd className="text-white leading-relaxed">{row.opportunity}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* Bridge */}
        <section className="container mx-auto px-6 lg:px-16 py-8 lg:py-12 max-w-5xl border-y border-white/10">
          <div className="grid md:grid-cols-[auto_1fr] gap-6 lg:gap-12 items-start">
            <div className="text-5xl lg:text-7xl font-mono font-bold text-white/20 tabular-nums leading-none">↓</div>
            <p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed">
              The stack is universal. But the layers don&apos;t break all at once. They break in a predictable order as revenue grows — and each break is a moment of opportunity for orchestration leverage.
            </p>
          </div>
        </section>

        {/* TABLE 02 — Scale Stages */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-7xl">
          <div className="flex items-center gap-2 mb-4 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">02 / WHAT BREAKS AS SMBs SCALE</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-2xl lg:text-4xl font-bold font-mono tracking-wider mb-4 lg:mb-6" style={{ letterSpacing: '0.04em' }}>
            REVENUE STAGES MAP TO BROKEN LAYERS.
          </h2>

          <p className="text-sm lg:text-base text-white/60 font-mono leading-relaxed max-w-3xl mb-10 lg:mb-14">
            Operational maturity is the new ladder. Capacity breaks first. Then quality. Then communication. Then visibility. Then memory. Then strategic coordination. The path is the same for almost every scaling SMB — only the timing varies.
          </p>

          {/* Desktop table */}
          <div className="hidden lg:block border border-white/10 overflow-hidden">
            <table className="w-full font-mono text-sm">
              <thead className="bg-white/[0.03]">
                <tr className="text-left text-white/40 tracking-widest text-[10px]">
                  <th className="px-6 py-4 font-normal w-[15%]">REVENUE STAGE</th>
                  <th className="px-6 py-4 font-normal w-[35%]">TYPICAL SMB SYMPTOMS</th>
                  <th className="px-6 py-4 font-normal w-[25%]">CORE CONSTRAINT</th>
                  <th className="px-6 py-4 font-normal">WHAT USUALLY BREAKS</th>
                </tr>
              </thead>
              <tbody>
                {scaleStages.map((row, i) => (
                  <tr
                    key={row.stage}
                    className={`border-t border-white/10 ${i % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.015]'}`}
                  >
                    <td className="px-6 py-6 align-top text-white font-bold text-base tabular-nums">{row.stage}</td>
                    <td className="px-6 py-6 align-top text-white/70 leading-relaxed">{row.symptoms}</td>
                    <td className="px-6 py-6 align-top text-white/80 leading-relaxed">{row.constraint}</td>
                    <td className="px-6 py-6 align-top text-white leading-relaxed border-l border-white/10">{row.breaks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden space-y-4">
            {scaleStages.map((row) => (
              <article key={row.stage} className="border border-white/10 p-5 font-mono text-xs">
                <div className="mb-4 pb-3 border-b border-white/10">
                  <div className="text-white/40 tracking-widest text-[9px] mb-1">REVENUE STAGE</div>
                  <h3 className="text-white font-bold text-lg tabular-nums">{row.stage}</h3>
                </div>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">SYMPTOMS</dt>
                    <dd className="text-white/70 leading-relaxed">{row.symptoms}</dd>
                  </div>
                  <div>
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">CORE CONSTRAINT</dt>
                    <dd className="text-white/80 leading-relaxed">{row.constraint}</dd>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <dt className="text-white/40 tracking-widest text-[9px] mb-1">WHAT USUALLY BREAKS</dt>
                    <dd className="text-white leading-relaxed">{row.breaks}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {/* Thesis closer */}
        <section className="container mx-auto px-6 lg:px-16 py-16 lg:py-24 max-w-5xl border-t border-white/10">
          <div className="flex items-center gap-2 mb-4 opacity-60">
            <div className="w-8 h-px bg-white"></div>
            <span className="text-white text-[10px] font-mono tracking-wider">03 / THESIS</span>
            <div className="flex-1 h-px bg-white"></div>
          </div>

          <h2 className="text-3xl lg:text-5xl font-bold font-mono tracking-wider mb-6 lg:mb-8 leading-tight" style={{ letterSpacing: '0.04em' }}>
            BOVERSE IS AN OPERATIONAL MATURITY
            <span className="block opacity-80 mt-1 lg:mt-2">AND ORCHESTRATION PLATFORM.</span>
            <span className="block opacity-60 mt-1 lg:mt-2">NOT A BAG OF AI FEATURES.</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-12 mb-10 lg:mb-12">
            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed">
              Rows are recognizable business realities. Columns are operational pain. The rightmost column is where intelligence and orchestration infrastructure create leverage.
            </p>
            <p className="text-sm lg:text-base text-white/70 font-mono leading-relaxed">
              We turn fragmented tribal operations into a coherent, observable, orchestrated system — without forcing the SMB to rebuild their tool stack.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 lg:gap-4">
            <Link
              href="/factory"
              className="inline-flex items-center justify-center px-6 lg:px-8 py-3 lg:py-4 border-2 border-white bg-white text-black font-mono text-xs lg:text-sm tracking-widest hover:bg-black hover:text-white focus-visible:bg-black focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200"
            >
              MAP YOUR OPERATING STACK →
            </Link>
            <Link
              href="/process"
              className="inline-flex items-center justify-center px-6 lg:px-8 py-3 lg:py-4 border-2 border-white/30 text-white font-mono text-xs lg:text-sm tracking-widest hover:border-white focus-visible:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200"
            >
              SEE THE PROCESS
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
