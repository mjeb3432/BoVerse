# Simulation runbook — Cold Front IPA

A step-by-step for running the Flint & Tinder demo end-to-end so the
client can see a working iteration before any real data is swapped in.

The pack is designed to be self-contained: all five evidence files plus
the expected output. The system, when fed the five files with the
Setup answers below, should produce something very close to
[EXPECTED-OUTPUT.md](EXPECTED-OUTPUT.md) — a draft proposal totaling
**$39,401.25 CAD** in agency fees.

## Before you start

You'll need:

- the BoVerse landing app running locally (`cd landing && npm run dev`)
  or a deployed instance
- LLM keys configured (Cerebras or Groq for text; Google for
  multimodal + embeddings) — without these, Discovery is disabled
- a Supabase Postgres URL configured — without it, the app falls back
  to an in-memory store, which is fine for the demo but does not
  persist between page refreshes

If any of these are missing the app will tell you on `/factory`.

## Step 1 — Open `/factory` and answer the Setup form

The page now opens with a Setup section above the outcome textarea —
four plain-English questions. For Cold Front, fill them in like this:

| Field | Suggested answer |
|---|---|
| Where does your work come in from? | "Inbound creative briefs over email — usually from the client's marketing lead. Sometimes attachments (decks, reference images)." |
| What do you want to produce? | "A draft priced proposal (one document, one total) that the client can sign without us going back and forth on options." |
| Where should the result land? | "Back to the client over email as a PDF attachment, plus a copy filed into our CRM under the client account." |
| Any specific connection details or sign-off contact? | "Creative Director (Sam) reviews everything before send for jobs $25K–$60K; Managing Partner (Mara) for anything over $60K." |

These answers anchor Discovery before it reads the evidence — they make
it more likely the inferred `source_system`, `output_format`,
`system_connector`, and `human_review` attributes match what you
actually have. They also travel with the bundle into the downstream
build swarm at handoff.

You can leave any field blank if you're not sure — the system degrades
gracefully.

## Step 2 — Describe the outcome

In the outcome textarea, type something like:

> "When a brewery (or any client) emails us a creative brief, we want
> to end up with a single priced proposal — one total, one document —
> that they can sign. The math should respect our rate card, our rush
> rules, and our discount thresholds. We don't want it to invent
> things that aren't in our playbook."

(Anything in the right ballpark works. Discovery uses this as a
soft anchor.)

## Step 3 — Drop the five files

Drag all five files from this folder into the dropzone:

- `01_inbound_brief.txt`
- `02_service_catalogue.json`
- `03_pricing_rules.json`
- `04_internal_playbook.md`
- `05_past_winning_proposal.txt`

Click **Discover**.

## Step 4 — Answer the open questions (Discovery gate)

Discovery may surface 1–3 questions. The expected ones are roughly:

| Question | Expected severity | Recommended answer |
|---|---|---|
| The per-service rush multiplier (1.35) and the category-level fallback (1.40) conflict — which wins? | low | Per-service wins. That's what the playbook says. |
| Northstar is at 1 prior job (Aurora). Confirm the repeat-client discount should not fire? | low | Confirm — threshold is 3. |
| The optional SOC-001 line — fold into total or surface as add-on? | medium | Surface as add-on, not in total. |

If Discovery doesn't ask the first one — that's a flag. It's a real
ambiguity in the evidence. The expected output handles it deterministically
(uses 1.35) but the user should be told the choice was made.

## Step 5 — Review the sample (the human-in-the-loop gate)

Discovery shows you two things and only two things:

1. **The sample output** — the draft proposal. It should look very close
   to [EXPECTED-OUTPUT.md](EXPECTED-OUTPUT.md), with grand total
   **$39,401.25 CAD**.
2. **The sample inputs** — the inferred inbound brief, the rate-card
   rows, the pricing rules, the client history. You can edit any of
   them and the proposal re-renders.

This is the BoVerse handoff point. Everything before this is Discovery
working on your behalf; everything after is you confirming the spec
that another team will build against.

### What to look for at this gate

- Grand total = **$39,401.25 CAD**
- Identity line carries the +35% rush multiplier; campaign and shoot do not
- Repeat-client discount line shows **not applied** (with a reason)
- Multi-SKU bundle line shows **not applied** (with a reason)
- Pass-through items are listed separately and explicitly "at cost"
- Deposit of $18,762.50 (50% rush rate)

If any of these are off, edit the corresponding sample input and click
"Re-render" — that's the loop the business user uses to converge on a
spec they trust.

### Where the human gates are exposed (per the BoVerse contract)

Three approval points are baked into this workflow and should appear
clearly in the sample:

1. **Discovery gate (this page)** — you approve the inferred workflow.
2. **Internal review gate ($25K–$60K)** — Creative Director sign-off
   before send. Appears in the sample as the "Internally routes to
   Creative Director for review" line.
3. **Client signature gate** — the proposal IS the artifact that goes
   to the client for signature. This is implicit; the document is
   marked DRAFT until signed.

If the sample omits any of these gates, that's a Discovery miss —
flag it and re-run.

## Step 6 — Approve

Click **Approve**. The page hands off to Build (Swarm 2), which
compiles only the BoVerse objects this archetype (`sharp_point_solution`)
requires. You'll be redirected to the bundle page when it's done.

## What "good" looks like at the end

- Archetype classified as `sharp_point_solution` (single inbound →
  single approved artifact, one decision point)
- Grand total = **$39,401.25 CAD** (or extremely close — within $50)
- Build refuses canonical tables for entities that don't recur (e.g.
  there is only one Priya Shah; we don't need a `client_contact`
  table)
- The bundle that gets handed off contains: the inferred spec, the
  approved sample, the rules registry, the human-in-the-loop gates,
  and the Setup answers from step 1

## What to do if it diverges

- **Total wrong (off by a small amount):** check the rush multiplier
  was 1.35, not 1.40, and that GST was applied last.
- **Total wrong (off by a lot):** check whether the repeat-client
  discount fired (it shouldn't), and whether media got marked up
  (it shouldn't).
- **Setup answers not visible in the bundle:** the Setup section may
  have been left empty before upload. Re-run.
- **Discovery never surfaces a question:** the LLM is being too
  confident. Lower the confidence threshold in
  `landing/lib/gaps.ts` or check that the evidence files were actually
  read (look at the operator drawer in the review surface).

## Swapping in real data

When the demo lands well and the client is ready to use their own data:

1. Replace `01_inbound_brief.txt` with one of their real briefs.
2. Replace `02_service_catalogue.json` and `03_pricing_rules.json`
   with their own rate card and rules.
3. Keep `04_internal_playbook.md` and `05_past_winning_proposal.txt`
   if they exist — they're judgment-layer evidence that materially
   improves Discovery.
4. Re-fill the Setup form with their actual source / output /
   destination / sign-off.
5. Run `/factory` again. Expected output and rules will differ; the
   shape (Discovery → human-review gate → handoff) is identical.
