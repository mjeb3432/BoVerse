# BoVerse Landing — TODOS

Captured during /plan-design-review on 2026-05-13.

Items here are deferred work, not blocking. Prune as you go.

## P1 — Before public launch

### 1. Swap Vitruvian Man hero animation to BoVerse-owned asset
- **What:** Currently `hero-ascii.tsx` renders UnicornStudio project `whwOGlfJ5Rz2rHaEUgHl` which is UIMIX-owned. Replace with a BoVerse-owned UnicornStudio project, or swap to local three.js (GLSL Hills already built and discarded), or simplify to CSS-only stars on desktop too.
- **Why:** Brand depends on third-party asset that could change/break/be deleted without warning. Traffic visible to UIMIX. Not safe for production.
- **Effort:** Human ~1-2 hours / CC ~30 min (if reusing GLSL Hills, reinstall `three` + `@types/three`, restore deleted files from git, swap import in `hero-ascii.tsx`).
- **Context:** GLSL Hills component was built during /design-shotgun variant B exploration and deleted during cleanup. Recoverable from `landing/.git` history. See DESIGN.md §11.

### 2. Wire form submit to a real backend
- **What:** Currently `app/contact/page.tsx` fakes the submit with a 1.5s setTimeout. Replace with real API endpoint (e.g., Next.js Route Handler `app/api/contact/route.ts` that emails the BoVerse team, or webhook to Formspree / Resend / similar).
- **Why:** Form doesn't actually send anything. Visitors think their intake was received but it wasn't.
- **Effort:** Human ~3-4 hours / CC ~45 min (Route Handler + email service integration + env vars for credentials).
- **Context:** The form state machine already handles loading and error states. Just need the real fetch call replacing the setTimeout. Network error UI is triggerable via `?error=1` for design preview.

### 3. ~~Replace default favicon~~ ✅ DONE 2026-05-13
- **What:** ~~`app/favicon.ico` is still the default Next.js favicon.~~
- **Resolution:** Replaced with `app/icon.svg` — bold italic skewed "B" mark on black with subtle bottom rule, matches the BOVERSE brand cluster aesthetic. Default favicon.ico removed.

### 4. ~~Create OG image for social sharing~~ ✅ DONE 2026-05-13
- **What:** ~~`app/layout.tsx` metadata references `openGraph` and `twitter` cards but no actual image asset is referenced.~~
- **Resolution:** Built `app/opengraph-image.tsx` using `next/og` ImageResponse — dynamic 1200x630 PNG with full BoVerse brand chrome (SYSTEM.ACTIVE row, BOVERSE skewed mark + EST. 2026, 001 section marker with rule, ATOMIC WORKFLOWS headline, tagline, ∞ · PRIMITIVES + boverse.ai footer). `app/twitter-image.tsx` re-uses the same composition. Both render at edge runtime.

### 5. Build /privacy and /terms pages
- **What:** Marketing site has no privacy policy or terms of service pages. Footer doesn't link to them.
- **Why:** Legal compliance for any data collection (contact form intake counts). GDPR / CCPA / state laws may require them. Footer should include "Privacy" and "Terms" links.
- **Effort:** Human ~2-3 hours / CC ~30 min (boilerplate from termly.io or similar, then BoVerse-customize and style to match design system).
- **Context:** Required if form collects any user data and BoVerse plans to launch publicly. Defer if pre-launch beta only.

## P2 — Post-launch polish

### 6. Build /404 page styled to design system
- **What:** Unknown routes hit the Next.js default 404 page (white background, generic styling). Build `app/not-found.tsx` with BoVerse aesthetic.
- **Why:** Off-brand error experience. Every typo'd URL goes to a default-Next-styled page.
- **Effort:** Human ~30 min / CC ~10 min.
- **Context:** Should include SiteHeader, SiteFooter, technical chrome, "404 · NOT FOUND" page hero, link back to /.

### 7. Wire analytics
- **What:** No analytics integration. No way to measure marketing site performance, traffic, conversion to /contact submit.
- **Why:** Can't iterate on the marketing without data. Don't know which pages convert, where users drop off, how the design changes affect outcomes.
- **Effort:** Human ~1-2 hours / CC ~15 min (Plausible or PostHog recommended over GA4; Plausible is privacy-friendly + lightweight).
- **Context:** Marketing site analytics. Not product analytics (that's the Workflow Factory's job).

### 8. Add ESC-to-close on mobile menu
- **What:** Mobile menu uses `<details>` element which doesn't support ESC-to-close natively. Tab + Enter to toggle works.
- **Why:** Keyboard users expect ESC to close any open menu. Minor accessibility gap.
- **Effort:** Human ~30 min / CC ~10 min (convert `<details>` to controlled state with useState + useEffect keydown listener).
- **Context:** Affects `components/site/site-header.tsx`. Acceptable as a known limitation per DESIGN.md §11.

### 9. Numbering consistency: page heros use 001/002, home below-fold uses 01/02
- **What:** Page-hero strips render section markers as "001" while home below-fold sections render as "01". Pick one convention.
- **Why:** Cosmetic inconsistency. Either everything 2-digit or everything 3-digit.
- **Effort:** Human ~10 min / CC ~5 min (find and replace across pages).
- **Context:** Recommend 02-digit (01, 02, ...) for shorter chrome. Or 03-digit for system-display feel. Pick one.

### 10. Light theme toggle
- **What:** No light theme. Brand is dark; intentional design choice.
- **Why:** Some users prefer light mode for accessibility (light sensitivity, daylight readability). Brand is dark, but a light variant could be offered.
- **Effort:** Human ~4-6 hours / CC ~1 hour (significant rework of color tokens; would need to recolor every white/N opacity layer for light bg).
- **Context:** Deferred indefinitely per intentional design choice. BoVerse brand is dark. Light theme would dilute brand. Listed for completeness only.
