# BoVerse Landing — Design System

Extracted from the implementation on 2026-05-13 during /plan-design-review.

This is the canonical reference for the BoVerse marketing site visual system.
New pages and components MUST conform. Drift requires explicit revision of this doc.

## 1. Voice and aesthetic

**Brand voice:** technical, forensic, system-display. BoVerse productizes consulting
into an AI workflow factory. The marketing site signals "we read what your business
already produces, and we tell you back what we found." Mono typography, status badges
with semantic color, primitive grammar exposed in chrome. Closer to Datadog or Linear
than to Calendly or Notion.

**What we are NOT:** generic SaaS. No purple gradients, no icon-in-colored-circle
features, no centered-everything, no decorative blobs. No emoji. No stock illustrations.

**Hero animation:** WebGL Vitruvian Man (currently UnicornStudio project `whwOGlfJ5Rz2rHaEUgHl`).
The Vitruvian Man references universal proportions of human anatomy. BoVerse's thesis
is universal primitives of workflows. The thematic parallel is intentional.

## 2. Color tokens

All colors derive from a single black-and-white ladder plus two semantic accents.
No grays beyond opacity layers.

| Token | Value | Usage |
|-------|-------|-------|
| `bg-black` | `#000000` | All page backgrounds, default surface |
| `bg-white/[0.02]` | white at 2% opacity | Subtle section differentiation (alternating sections) |
| `bg-white/[0.04]` | white at 4% opacity | Drag-active state on file drop zone |
| `text-white` | pure white | Primary text, headlines, brand mark |
| `text-white/90` | 90% white | Secondary headline emphasis |
| `text-white/80` | 80% white | Strong-but-secondary text |
| `text-white/70` | 70% white | Body paragraph text |
| `text-white/60` | 60% white | Nav links default, secondary chrome |
| `text-white/50` | 50% white | Footer system labels |
| `text-white/40` | 40% white | Chrome labels (FORM FIELD LABELS, section markers) |
| `text-white/30` | 30% white | Tertiary chrome, placeholder text |
| `border-white` | pure white | Primary button borders, focus rings |
| `border-white/30` | 30% white | Standard input/card borders |
| `border-white/20` | 20% white | Chrome borders, dividers |
| `border-white/10` | 10% white | Subtle section dividers |
| `border-white/5` | 5% white | Internal row dividers in tables |

**Semantic accents** (carry meaning, never decorative):

| Accent | Hex / Tailwind | Usage |
|--------|----------------|-------|
| Yellow | `yellow-400` | INFERRED status, warning/inference uncertainty |
| Orange | `orange-400` | NEEDS CAPTURE, EDGE CASE flag, HUMAN gate, validation errors, network errors |
| White | n/a (default) | PROVIDED status, AUTO actor, safe / valid state |

**Rule:** Never invent new colors. If a state needs a color, it maps to one of these
three semantic categories or to the white-opacity ladder.

## 3. Typography

**Font family:** `font-mono` (Geist Mono, set in `app/layout.tsx`).
Geist Sans is configured but unused. The marketing site is mono-only.

**Type scale:**

| Use | Size | Tracking | Weight |
|-----|------|----------|--------|
| Page hero headline | `text-4xl lg:text-7xl` | `tracking-wider` + `letterSpacing: 0.08em` | `font-bold` |
| Section headline | `text-3xl lg:text-5xl` | `tracking-wider` + `letterSpacing: 0.06em` | `font-bold` |
| Subsection headline | `text-2xl lg:text-4xl` | `tracking-wider` + `letterSpacing: 0.05em` | `font-bold` |
| Card / item heading | `text-base lg:text-lg` | `tracking-widest` | `font-bold` |
| Body paragraph | `text-sm lg:text-base` | default | normal |
| Small body | `text-xs lg:text-sm` | default | normal |
| Form input | `text-sm` | default | normal |
| Chrome labels (FIELD LABEL, SECTION MARKER) | `text-[10px]` | `tracking-widest` | normal |
| Chrome footer | `text-[8px] lg:text-[9px]` | default | normal |
| Inline status badges | `text-[9px] lg:text-[10px]` | `tracking-widest` | normal |

**Headline pattern:** all caps, mono, wide tracking. Two-line headlines treat the
second line with `opacity-90` for hierarchy ("ATOMIC / WORKFLOWS" — second line slightly softer).

**Body pattern:** mono, mixed case, comfortable line-height (`leading-relaxed`),
max-width constrained (`max-w-2xl` / `max-w-3xl` for readability).

## 4. Spacing scale

**Container:**
- `container mx-auto`
- `px-6 lg:px-16` for content padding
- Max widths: `max-w-5xl` (process-style focused content), `max-w-6xl` (data-dense pages like /example, /contact)

**Section padding:**
- Standard section: `py-16 lg:py-24`
- Hero section: `py-20 lg:py-32`
- Final CTA section: `py-24 lg:py-40` (extra breathing room before footer)

**Gap rhythm:**
- Element gaps: `gap-3 lg:gap-4` (card grids), `gap-6 lg:gap-12` (major content blocks)
- Section spacing: `space-y-12 lg:space-y-20` (between stage cards)
- Inline gaps: `gap-2 lg:gap-3` (chrome elements)

## 5. Components

### 5.1 Page hero strip

Every non-home page starts with a "page hero strip":

```
[hairline] [SECTION NAME · 001] [hairline ────────────]
[BIG HEADLINE]
[supporting paragraph]
```

Markup pattern:
```jsx
<div className="flex items-center gap-2 mb-6 opacity-60">
  <div className="w-8 h-px bg-white"></div>
  <span className="text-white text-[10px] font-mono tracking-wider">SECTION NAME</span>
  <div className="flex-1 h-px bg-white"></div>
</div>
<h1 className="text-4xl lg:text-7xl font-bold font-mono tracking-wider leading-[1.05] mb-6 lg:mb-8" style={{ letterSpacing: '0.08em' }}>
  HEADLINE
</h1>
<p className="text-sm lg:text-lg text-white/70 font-mono leading-relaxed max-w-2xl">
  Supporting text.
</p>
```

### 5.2 Corner frame accents

Page hero sections get corner frames in two opposing corners (visual signal that you're
in a hero/page-marker zone):

```jsx
<div className="absolute top-0 left-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-l-2 border-white/20"></div>
<div className="absolute top-0 right-0 w-8 h-8 lg:w-12 lg:h-12 border-t-2 border-r-2 border-white/20"></div>
```

Use only on heros and on the final CTA section. Don't sprinkle corner frames into
mid-page sections — they signal page-level chrome, not section chrome.

### 5.3 Status badges

Inline labels that carry semantic state:

```jsx
<span className={`text-[9px] font-mono tracking-widest px-2 py-0.5 border ${color}`}>
  {STATUS}
</span>
```

Color mapping (semantic, never invented):
- White border + white text: PROVIDED, AUTO, valid, safe
- Yellow border + yellow text: INFERRED, warning, uncertainty
- Orange border + orange text: NEEDS CAPTURE, EDGE CASE, HUMAN, validation error, network error

### 5.4 Cards

Use cards ONLY when the card IS the interaction (clickable, expandable) OR when each
card represents a distinct item in a small set (e.g., 5 workflow primitives, 5 stages).
Never use decorative card grids.

```jsx
<div className="border border-white/20 p-4 lg:p-5 hover:border-white/40 transition-colors">
  <div className="text-[10px] font-mono text-white/40 tracking-widest mb-3 lg:mb-4">
    {LABEL}
  </div>
  <div className="text-base lg:text-lg font-mono font-bold tracking-widest mb-2 lg:mb-3">
    {NAME}
  </div>
  <div className="text-[11px] lg:text-xs font-mono text-white/60 leading-relaxed">
    {DESCRIPTION}
  </div>
</div>
```

### 5.5 Buttons

Two variants, sharp corners always, mono uppercase, `tracking-widest`:

**Primary** (solid white, inverts on hover):
```jsx
<Link
  href="..."
  className="px-6 lg:px-8 py-2.5 lg:py-3 bg-white text-black font-mono text-xs lg:text-sm border border-white hover:bg-transparent hover:text-white focus-visible:bg-transparent focus-visible:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200 tracking-widest"
>
  PRIMARY ACTION
</Link>
```

**Secondary** (outlined, fills on hover):
```jsx
<Link
  href="..."
  className="px-6 lg:px-8 py-2.5 lg:py-3 bg-transparent border border-white text-white font-mono text-xs lg:text-sm hover:bg-white hover:text-black focus-visible:bg-white focus-visible:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all duration-200 tracking-widest"
>
  SECONDARY ACTION →
</Link>
```

**Never** use rounded buttons. **Never** add gradients. **Never** use icon-only buttons
(always include text). **Always** include `focus-visible:` ring for keyboard.

### 5.6 Tables

Borderless containers with explicit header row and hover-tinted rows:

```jsx
<div className="border border-white/20">
  <div className="grid grid-cols-12 gap-3 px-4 py-2 border-b border-white/10 text-[10px] font-mono text-white/40 tracking-widest bg-white/[0.02]">
    <div className="col-span-6">COLUMN A</div>
    <div className="col-span-3">COLUMN B</div>
    <div className="col-span-3">STATUS</div>
  </div>
  {rows.map(row => (
    <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors items-center">
      ...
    </div>
  ))}
</div>
```

### 5.7 Form fields

All inputs: transparent background, white/30 border, focus state with full white border
plus `focus-visible:ring-1 focus-visible:ring-white`. Error state uses `border-orange-400/60`.

Required fields: label gets `*` visible + `<span class="sr-only">required</span>`.

Error messages: `text-[11px] font-mono text-orange-400/80 mt-1.5` with `role="alert"`.

## 6. Iconography

**ASCII symbols only.** Approved set:
- `→` next action / link affordance
- `↓` scroll / downward action
- `·` separator
- `∞` infinity / system idle
- `◐` half-state / process indicator
- `*` required / footnote
- `×` close / remove

**Never:** emoji (no 🚀 no 🎯 no ✨), lucide-react icons (or any icon library), illustrated SVGs.

## 7. Layout patterns

### 7.1 Site shell

Every page except the hero home (`/`):
```
<SiteHeader />
<main>
  <PageHeroSection />
  <ContentSections />
  <CTASection />
</main>
<SiteFooter />
```

Home (`/`):
```
<Hero />  (full-viewport hero with Vitruvian Man)
<HomeBelowFold />  (5 narrative sections)
<SiteFooter />
```

### 7.2 SiteHeader

Sticky top, `bg-black/80 backdrop-blur-md`, border-bottom hairline. Contains brand
mark left, nav links + primary CTA right. Mobile: nav collapses to `<details>` menu.

### 7.3 SiteFooter

Two rows:
1. System chrome row (SYSTEM.ACTIVE / WORKFLOW.FACTORY / v1.0 / INGESTING pulse)
2. Main footer (BRAND tagline / Product links / Company links / Stack callouts)
Plus bottom row: copyright + system code

## 8. Responsive breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Default (mobile) | < 640px | Single column, smaller type, mobile menu via `<details>` |
| `sm:` | ≥ 640px | Form layout adjusts to side-by-side where applicable |
| `md:` | ≥ 768px | Nav links visible, tablet adjustments |
| `lg:` | ≥ 1024px | Full desktop layout, hero animation visible (Vitruvian Man hidden on mobile) |

Mobile-first by default. Use `lg:` prefix to scale up, not `sm:max-` to scale down.

## 9. Accessibility commitments

- All focus-visible states render a `ring-2 ring-white ring-offset-2 ring-offset-black`
  on interactive elements
- All form inputs have visible labels (no placeholder-as-only-label pattern)
- Required fields use both visible `*` AND `<span class="sr-only">required</span>`
- Error messages use `role="alert"` and are linked via `aria-describedby`
- All decorative ASCII glyphs use `aria-hidden="true"`
- `prefers-reduced-motion: reduce` disables all animations and smooth scroll (in globals.css)
- Minimum color contrast: all body text uses white/60 or stronger (passes WCAG AA on
  black background). Chrome labels at white/40 are larger size or non-essential and
  acceptable as decorative-but-informative

## 10. Meta-rules (the "never" list)

- Never round corners (sharp always)
- Never use emoji (ASCII symbols only)
- Never use icon libraries (lucide, heroicons, etc.)
- Never use system-ui or Inter as the primary font (Geist Mono only)
- Never invent new colors outside the white-opacity ladder + yellow-400 + orange-400
- Never use centered text for body content (centered only for hero/CTA headlines and final CTA section)
- Never use decorative blobs, gradients, wavy SVGs, or illustrated backgrounds
- Never use placeholder-as-only-label form fields
- Never ship without focus-visible states on every interactive element

## 11. Open / deferred decisions

- **Hero animation ownership:** Vitruvian Man is currently a UIMIX UnicornStudio project ID.
  For production, create a BoVerse-owned UnicornStudio project or swap to alternative.
- **Light theme:** dark mode only currently. No toggle. Decision deferred.
- **Site metadata:** title / OG image / favicon currently default Next.js. Customize before launch.
- **404 page:** not built. Will use Next.js default if user hits unknown route.
