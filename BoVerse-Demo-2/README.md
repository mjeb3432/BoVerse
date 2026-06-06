# BoVerse-Demo-2 — sample evidence pack (Flint & Tinder)

This folder is a **sample evidence pack** — not a simulation pack. The
simulation pack is what BoVerse *produces* per user, per session, by
running Discovery against whatever evidence the user uploads. This
pack is just one realistic set of evidence to feed in for a first run.

The scenario: a Calgary creative agency (Flint & Tinder) turning an
inbound brief from a returning client (Northstar Brewing, "Cold Front"
IPA Q3 launch) into a single priced proposal. It classifies as a
**`sharp_point_solution`** — one trigger, one artifact, one
human-review gate.

## Files (evidence only)

| File | Role |
|---|---|
| `01_inbound_brief.txt` | The trigger — a creative brief, freeform email |
| `02_service_catalogue.json` | Rate card with per-service rush multipliers |
| `03_pricing_rules.json` | Deterministic pricing rules (multiplier-before-discount, repeat-client thresholds, media pass-through) |
| `04_internal_playbook.md` | The judgment layer — the agency's SOP |
| `05_past_winning_proposal.txt` | A prior accepted proposal (Aurora launch) — the format and bar |
| `SIMULATION-RUNBOOK.md` | Step-by-step for running BoVerse against this evidence |

There is **no `EXPECTED-OUTPUT.md` or `EXPECTED-OUTPUT.json`** in this
folder by design. The expected output is the live, per-session
simulation pack BoVerse generates for you when you run Discovery
against this evidence. Use the **Download simulation pack** button in
the review surface to take that generated pack with you.

## Why this matters

A simulation pack is not a fixture — it is the *deliverable* of
Discovery. Every BoVerse run produces:

- a draft of the final artifact the user actually wants (e.g. a priced
  proposal),
- the per-run inputs that would have to exist to produce it (back-solved
  from the artifact),
- the sign-off gates that govern it,
- the structured Setup answers that anchor the workflow.

That bundle — generated per session — is what gets handed off to the
downstream Build swarm in another app. Committing a static
"expected output" would have made the pack look like a stand-alone
template, and that is the opposite of what BoVerse does.

## When to swap in real data

When the demo lands and the client is ready to use their own data,
replace the five evidence files above with their real briefs / rate
cards / rules / playbooks, re-fill the Setup form with their real
source / output / destination / sign-off, and run `/factory` again.
Same flow. Different inputs. Different per-session simulation pack
on the way out.
