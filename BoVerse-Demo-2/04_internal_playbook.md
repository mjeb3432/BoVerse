# Flint & Tinder — Internal Playbook

**Brief → Priced Proposal**
*Updated April 2026 by Sam (Creative Director). For internal use.*

This is the playbook the pod runs every time a new brief comes in. It is
not a rulebook for the client. The actual numbers live in
`02_service_catalogue.json` and `03_pricing_rules.json`. This document is
the *judgment layer* on top.

---

## 1. The first 24 hours

When a brief lands, the lead on duty (currently Jules) does five things
in order, no exceptions:

1. **Read the brief end-to-end before anything else.** Don't skim for the
   budget number and start estimating — read it like the client wrote
   it. What are they actually anxious about?
2. **Identify the SKU count.** One product, or more than one? This drives
   the Multi-SKU Bundle Discount eligibility (see pricing rules). Most
   briefs are single-SKU.
3. **Identify the deliverable bundle.** Identity? Campaign? Shoot?
   Paid social? Map each ask to a service code in the catalogue. If
   something doesn't fit a code, flag it — don't shoehorn.
4. **Identify the timeline.** Compare the client's requested delivery
   date against each service's standard delivery window. Any service
   whose delivery is INSIDE its standard window is a rush line.
5. **Identify the account history.** Pull the client's prior-jobs count
   from the CRM. This is what determines whether the Repeat-Client
   Discount fires — not gut feel about whether they're a "good client."

## 2. The pricing math (this is the part people get wrong)

The order is **multipliers first, then discounts**. Always. This is the
Lighthaus rule (see pricing rules) and it is the only pricing order
audit we ever care about.

Worked example: a $10,000 line gets a 35% rush multiplier and a 5% repeat
discount.

- Wrong: $10,000 × 0.95 × 1.35 = $12,825
- Right: $10,000 × 1.35 × 0.95 = $12,825... wait, those are the same?

Yes — for one line, commutatively, they are. The reason we still insist
on multiplier-first is that **discounts apply to the adjusted subtotal**,
not to individual lines. When the proposal has multiple lines and only
some are rushed, applying the discount to the unadjusted subtotal gives
the client more than the rules intend. Always compute the full adjusted
subtotal, THEN take the discount off it.

(This is also the part to spend an extra five minutes on if the proposal
is over $40K. The lost margin from doing it backwards on a big job has
paid for an offsite.)

## 3. Multi-SKU vs multi-deliverable — a common mistake

Multi-deliverable (identity + campaign + shoot for ONE product) is **not**
multi-SKU. Multi-SKU is two or more products. A common rookie error is to
look at three deliverables and assume the bundle discount applies. It
does not.

> Soft rule we keep in our pocket: if a brief is borderline — say, a
> single SKU with two product variants — *score* it against the
> Multi-SKU table to see what the bundle would look like, even though
> it doesn't strictly apply. Gives us a number to offer if the client
> pushes on price. Don't quote it in the first draft.

## 4. The repeat-client discount is harsh on purpose

The threshold is **3 prior jobs**. Not 2. Not "they feel like a repeat
client." We've been burned offering the discount at job 2 and then the
client churns — the discount turns out to have been a goodwill payment
to someone leaving anyway. **Three.**

A client at job 1 is a new client, full stop. Be warm in the proposal,
but charge full rate. The Aurora/Northstar history is the canonical
example — Aurora was their job 1, so Cold Front is job 2, so the
discount does NOT fire.

## 5. Media is always pass-through

This is the one we will not flex on. Print pre-press, talent buyouts,
ad spend, location permits, any third-party licensing — billed at cost,
period. The receipts go to the client. This is how we keep credibility
on the media side and how we sleep at night.

If a client asks for a "blended rate" on media — say no. Politely.

## 6. The approval gate is real

Before any proposal goes out:

- **≤ $25K** total agency fees: any lead can send.
- **$25K – $60K**: I see it first. Five-minute review, not a redesign
  session. I'm checking: pricing math, rush logic, discount eligibility.
- **> $60K**: Mara plus one other partner. We've never had this kick in
  for a single-product brief, but with the optional paid social SOC-001
  on Cold Front we'd be at $55–60K — borderline. Worth flagging.

## 7. Tone

Our proposals are **draft proposals**, not estimates. We send them as
the first version of the document the client will sign, not as a sales
pitch with a separate contract behind it. This means: every line is
something we would actually do at that price; every multiplier is
explained in one line, not in a paragraph of justification; every
pass-through is named so the client can see we're not hiding margin in
it.

If a draft can't survive that standard, it doesn't go out.

## 8. The Aurora proposal is the bar

Every priced proposal should pass the "would Aurora have approved this?"
test — the format, the line-item clarity, the way multipliers are
explained, the way pass-through is broken out. The Aurora proposal
(`05_past_winning_proposal.txt`) is the golden example. Match its
structure unless you have a reason not to.

---

*Questions, edge cases, or weird briefs — Slack me. Sam.*
