# BoVerse-Demo-2 — Flint & Tinder simulation pack

This is the canonical worked example BoVerse ships with: a Calgary
creative agency (Flint & Tinder) turning an inbound brief from a
returning client (Northstar Brewing, "Cold Front" IPA Q3 launch) into a
single priced proposal.

It classifies as a **`sharp_point_solution`** — one trigger, one
artifact, one human-review gate — and is the smallest archetype the
system supports. If a customer's workflow is more complex than this,
BoVerse will still discover it, but this pack is the right place to
start when introducing the system.

## Files

| File | Role |
|---|---|
| `01_inbound_brief.txt` | The trigger — a creative brief, freeform email |
| `02_service_catalogue.json` | Rate card with per-service rush multipliers |
| `03_pricing_rules.json` | Deterministic pricing rules (multiplier-before-discount, repeat-client thresholds, media pass-through) |
| `04_internal_playbook.md` | The judgment layer — the agency's SOP |
| `05_past_winning_proposal.txt` | A prior accepted proposal (Aurora launch) — the format and bar |
| `EXPECTED-OUTPUT.md` | What BoVerse should produce — human-readable form ($39,401.25) |
| `EXPECTED-OUTPUT.json` | The same proposal as a structured contract for the downstream Build swarm |
| `SIMULATION-RUNBOOK.md` | Step-by-step for running the demo and what to look for at each gate |

## Why this pack matters

A simulation pack is the way BoVerse demonstrates value **before the
client commits any real data**. The flow is:

1. Show the client the brief (their reality).
2. Show the client the expected proposal (the deliverable they'd want).
3. Run the system and confirm the deliverable falls out.
4. Then — and only then — ask them to drop in their real files.

[EXPECTED-OUTPUT.md](EXPECTED-OUTPUT.md) is what makes step 2 possible
without running the system. [SIMULATION-RUNBOOK.md](SIMULATION-RUNBOOK.md)
is what makes step 3 reliable.

## The handoff

Per the BoVerse model, this app's job ends at Discovery + sample
approval. The approved bundle — spec + sample output + rules registry +
the Setup answers from the new pre-upload intake — is then handed off
to a downstream Build swarm in another application for execution. This
pack exercises that handoff: every artifact in it is something the
downstream swarm needs to actually build the workflow.
