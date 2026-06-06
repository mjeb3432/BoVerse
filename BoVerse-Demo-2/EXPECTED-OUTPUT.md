# Expected output — Cold Front IPA proposal

This is what BoVerse should produce when the five evidence files in this
folder are uploaded to `/factory` with the Setup answers from the
[SIMULATION-RUNBOOK](SIMULATION-RUNBOOK.md).

It is provided so the client (and Rohit) can **see a working iteration
before swapping in real data** — you don't need to run the system to
know what it would output. If the actual run diverges from this, the
runbook tells you which gate to look at.

**Two views of the same proposal:** this markdown is the human-facing
form; [`EXPECTED-OUTPUT.json`](EXPECTED-OUTPUT.json) is the structured
contract the downstream Build swarm consumes (line items, computed
sub-totals, rule provenance, sign-off gates). They are kept in sync —
edit one, update the other.

The total is **$39,401.25**, achieved by honoring three rules from
`03_pricing_rules.json` and `04_internal_playbook.md`:

1. **Multiplier-before-discount** ordering (the Lighthaus rule)
2. **Media as pass-through at cost** (never marked up)
3. **No repeat-client discount** (Northstar at 1 prior job; threshold is 3)

---

## PROPOSAL — DRAFT

**Prepared for:** Northstar Brewing — Cold Front IPA, Q3 launch
**Prepared by:** Flint & Tinder
**Date:** 2026-05-29 · **Valid until:** 2026-06-28 (30 days)

### Engagement summary

Full Q3 creative engagement for the Cold Front IPA launch (drop date
August 5): brand identity for the new SKU, a 5-week multi-channel launch
campaign, and a half-day local photo/video shoot. Identity work
compressed to a July 1 sub-deadline to meet your July 7 can-print date.

### Scope / Line items

| Code | Service | Rate (CAD) |
|---|---|---|
| ID-001 | Brand identity (single product) — label + can art + tap handle, fits existing Aurora/Glacier system | $9,500 |
| CAMP-001 | Launch campaign (5-week, multi-channel) — concept + 4 video edits + 12 static social + 2 billboard layouts + in-store collateral | $18,500 |
| PHOTO-001 | Photo/video shoot (half-day, local) — 1 location, 1 talent, 30 retouched stills, 4 short-form video edits | $6,200 |
| | **Subtotal (rate card)** | **$34,200** |

### Multipliers

| Adjustment | Basis | Amount |
|---|---|---|
| Rush — identity (delivered by July 1, inside standard 21-day window) | +35% on ID-001 ($9,500) | +$3,325 |
| | **Adjusted subtotal** | **$37,525** |

### Discounts

| Adjustment | Basis | Amount |
|---|---|---|
| Repeat-client discount | Not applied — Northstar at 1 prior job (Aurora); discount begins at 3 jobs | — |
| Multi-SKU bundle discount | Not applied — single-SKU launch (Cold Front only) | — |
| | **Pre-pass-through total** | **$37,525** |

### Pass-through (billed at cost — never marked up)

| Item | Amount |
|---|---|
| Print pre-press setup (printer TBC) | *to be confirmed* |
| Talent buyout — 12 months | *to be confirmed* |
| Location permit (half-day) | *to be confirmed* |
| _Paid social ad spend (~$8K/mo, if SOC-001 added)_ | *pass-through at cost, separate* |

### Total

| | CAD |
|---|---|
| Total before GST | **$37,525.00** |
| GST (5%) | +$1,876.25 |
| **Grand total (agency fees)** | **$39,401.25** |

### Payment terms

50% deposit on signature ($18,762.50 — rush deposit rate), balance net-30.

**Optional add-on (not in total above):** Paid social management (SOC-001)
at $4,200/mo for the 5-week campaign; ad spend billed through at cost.

*This is a draft for your review. Tell us anything that looks off, or
change a detail (deadline, scope, which identity package), and we'll
re-draft.*

---

## How each number traces back to a rule

For Rohit / engineering — every figure above can be traced to a
specific row in the evidence:

| Number | Source | Rule fired |
|---|---|---|
| $9,500 (ID-001 line) | `02_service_catalogue.json` → `services[0].rate_card_cad` | none — rate card lookup |
| $18,500 (CAMP-001 line) | `02_service_catalogue.json` → `services[1].rate_card_cad` | none — rate card lookup |
| $6,200 (PHOTO-001 line) | `02_service_catalogue.json` → `services[2].rate_card_cad` | none — rate card lookup |
| $34,200 (subtotal) | sum of the three lines above | — |
| +$3,325 (rush) | `02_service_catalogue.json` → `services[0].rush_multiplier` = 1.35, on $9,500 | `pricing_rules.json` → `rush` (July 1 ≤ 21-day window of ID-001) |
| $37,525 (adjusted subtotal) | $34,200 + $3,325 | `pricing_rules.json` → `pricing_order` (multiplier-before-discount) |
| — (no repeat discount) | `05_past_winning_proposal.txt` says Northstar is at 1 prior job; threshold is 3 | `pricing_rules.json` → `discounts.repeat_client.repeat_client_threshold_jobs` = 3 |
| — (no multi-SKU bundle) | Single SKU (Cold Front only) | `pricing_rules.json` → `discounts.multi_sku_bundle` trigger |
| $1,876.25 (GST) | 5% on $37,525 | `pricing_rules.json` → `tax.gst_percent` = 5.0 |
| $39,401.25 (grand total) | $37,525 + $1,876.25 | — |
| $18,762.50 (deposit) | 50% × $37,525 (rush deposit rate, because ID-001 has rush) | `pricing_rules.json` → `deposit.rush_deposit_percent` = 50 |

## Where the rush multiplier ambiguity surfaces

`02_service_catalogue.json` gives ID-001 a per-service `rush_multiplier`
of **1.35**. `03_pricing_rules.json` gives a category-level
`rush_multipliers_fallback_by_category.identity` of **1.40**. The
playbook (§rush) says the per-service rate wins when both exist — so
the proposal uses **1.35**.

BoVerse should still surface this as a low-severity question at the
Discovery gate ("Confirm: the per-service rush multiplier (1.35) wins
over the category fallback (1.40)?"). If you don't see that question
appear, Discovery is being too quiet — flag it.

## What this proposal does NOT do (and why)

- **Does NOT apply the Multi-SKU Bundle Discount.** Cold Front is a
  single SKU. Even though three deliverables (identity + campaign +
  shoot) are bundled, the rule is about SKU count, not deliverable
  count. The playbook is explicit about this.
- **Does NOT apply a 5% repeat discount.** Northstar is at 1 prior
  job (Aurora). The threshold is 3. The playbook is explicit that
  "feels like a repeat client" doesn't count.
- **Does NOT include SOC-001 (paid social management) in the total.**
  Priya marked it as optional. Surfaced as an add-on line under the
  total, not folded in.
- **Does NOT mark up media.** All pass-through items are at cost.
  This is the non-negotiable trust trade with the client.

If BoVerse's actual output diverges on any of these four points, that
divergence is the test signal — either the rule was misread, or the
evidence is genuinely ambiguous (in which case it should have been a
Discovery question, not a silent decision).
