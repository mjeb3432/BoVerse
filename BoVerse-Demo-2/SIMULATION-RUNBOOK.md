# Runbook — feeding the Flint & Tinder sample evidence into BoVerse

A step-by-step for running BoVerse against the sample evidence in this
folder. The simulation pack the system generates for you is the
deliverable — there is no fixture file in this folder you compare
against. You compare against the rules.

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

The page opens with a Setup section above the outcome textarea —
seven optional questions. For Cold Front, fill them in like this:

| Field | Suggested answer |
|---|---|
| Where does your work come in from? | "Inbound creative briefs over email — usually from the client's marketing lead. Sometimes attachments (decks, reference images)." |
| How does it arrive? | **Forwarded emails / mailbox** |
| What types of files will you upload? | ".eml emails, .xlsx rate cards, .pdf reference decks, occasional screenshots." |
| What do you want to produce? | "A draft priced proposal (one document, one total) that the client can sign without us going back and forth on options." |
| Where should the result land? | "Back to the client over email as a PDF attachment, plus a copy filed into our CRM under the client account." |
| How should the result leave? | **Files I upload by hand** *(or **Live API / system integration** once the CRM connector is in)* |
| Any specific connection details or sign-off contact? | "Creative Director (Sam) reviews everything before send for jobs $25K–$60K; Managing Partner (Mara) for anything over $60K." |

These answers anchor Discovery before it reads the evidence — they make
it more likely the inferred `source_system`, `output_format`,
`system_connector`, and `human_review` attributes match what you
actually have. They are also embedded in the simulation pack the
system hands off to the build team.

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

Drag all five evidence files from this folder into the dropzone:

- `01_inbound_brief.txt`
- `02_service_catalogue.json`
- `03_pricing_rules.json`
- `04_internal_playbook.md`
- `05_past_winning_proposal.txt`

Click **Discover**.

## Step 4 — Answer the open questions (Discovery gate)

Discovery may surface 1–3 questions. For this evidence, expect
something close to:

| Question | Expected severity | Recommended answer |
|---|---|---|
| The per-service rush multiplier (1.35) and the category-level fallback (1.40) conflict — which wins? | low | Per-service wins. The playbook is explicit. |
| Northstar is at 1 prior job (Aurora). Confirm the repeat-client discount should not fire? | low | Confirm — threshold is 3. |
| The optional SOC-001 line — fold into total or surface as add-on? | medium | Surface as add-on, not in total. |

If Discovery doesn't ask the first one — flag it. It's a real
ambiguity in the evidence and the system is being too quiet.

## Step 5 — Review the generated simulation pack

This is what BoVerse hands you: a per-session simulation pack consisting
of three things, all generated from your evidence + Setup answers:

1. **Sample output** — a draft of the deliverable, rendered the way it
   would actually be received. For Cold Front evidence this should be a
   draft proposal, and the math should land at a grand total of
   approximately **$39,401.25 CAD** (the rules below explain why).
2. **Sign-off gates** — every human-in-the-loop point the workflow
   has, listed with role + trigger.
3. **Sample inputs** — the per-run inputs back-solved from the output;
   edit any of them and the output re-renders.

There is no fixture to compare against. You compare against the
**rules**, which are encoded in the evidence:

### What the rules say should be true

- Grand total = ~**$39,401.25 CAD** (within ~$50 is fine; rounding +
  LLM phrasing varies)
- The identity line carries a **+35% rush multiplier**; the campaign and
  shoot lines do not
- The repeat-client discount shows **not applied** with a reason
  (Northstar at 1 prior job, threshold is 3)
- The multi-SKU bundle discount shows **not applied** with a reason
  (single SKU only — rule is about SKU count, not deliverable count)
- Pass-through items are listed separately and explicitly **at cost**
  (never marked up)
- Deposit is **$18,762.50** (50% rush rate, because ID-001 carries a
  rush multiplier)
- Three sign-off gates: Discovery gate (this page), Creative Director
  review ($25K–$60K band), client signature

If any of these are off, edit the corresponding sample input and click
**Re-render** — that's the loop the business user uses to converge on
a spec they trust.

## Step 6 — Download the simulation pack

Click **Download simulation pack** on the review surface. This pulls the
authoritative handoff contract from the server
(`GET /api/factory/swarm1/handoff?session_id=…`) — the same bytes the
downstream Build swarm would fetch — and saves a JSON file containing:

- `handoff_contract_version` — pin the downstream consumer to this
- `setup_intake` — the Setup answers from Step 1 (your structured
  integration points; `sourceMode` / `destinationMode` are the
  switchable values)
- `wds` — the full Workflow Design Specification (the deterministic
  blueprint: outputs, inputs, rules, steps, sign-off gates, and the
  build recommendation — what to build and what to refuse)
- `simulation` — the sample output + back-solved sample inputs +
  step trace
- `approval` — the approval record; `approved` is `false` until you
  approve in Step 7, so a pack downloaded now is for inspection

This is the artifact that hands off to the downstream Build swarm. It
is generated for THIS session against YOUR evidence — no two runs
produce the same pack. See [`docs/workflow-creator/HANDOFF.md`](../docs/workflow-creator/HANDOFF.md)
for the full contract.

> On a local dev session with no database, the button falls back to a
> client-assembled pack (`handoff_source: "client_fallback"`) with the
> same Setup answers + sample surfaces but a `wds_summary` instead of
> the full `wds`. Configure `DATABASE_URL` to get the authoritative
> server contract.

## Step 7 — Approve

Click **Approve**. The page hands off to Build (Swarm 2), which
compiles only the BoVerse objects this archetype
(`sharp_point_solution`) requires. You'll be redirected to the bundle
page when it's done.

## Swapping in real data

When the demo lands well and the client is ready to use their own data:

1. Replace `01_inbound_brief.txt` with one of their real briefs.
2. Replace `02_service_catalogue.json` and `03_pricing_rules.json`
   with their own rate card and rules.
3. Keep `04_internal_playbook.md` and `05_past_winning_proposal.txt`
   if they have equivalents — they're judgment-layer evidence that
   materially improves Discovery.
4. Re-fill the Setup form with their actual source / output /
   destination / sign-off.
5. Run `/factory` again. Their per-session simulation pack will be
   completely different. Same flow.
