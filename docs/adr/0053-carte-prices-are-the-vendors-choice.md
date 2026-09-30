# 0053. The carte's prices are the vendor's choice, shown by default

Date: 2026-08-28 · Status: Accepted · Amends: 0052

## Context

ADR 0052 decided that the carte quotes nothing, and gave a good reason: a carte
is tied to no market, so there is no one price it could honestly name. It
recorded the objection it was overruling — *"a carte with no prices reads as a
page missing something"* — and accepted that cost on every vendor's behalf.

That is the part worth reopening. Whether a browse of everything you make should
carry prices is a judgement about a business, not about a data model. A chalkboard
at a market stall usually carries them; some traiteurs deliberately quote on
request. The product had answered for all of them.

Nothing in 0052's reasoning is wrong. What changed is who decides.

## Decision

**The choice belongs to `Storefront`.** It is a fact about what the vitrine
publishes, not about what the catalogue contains — the same aggregate that
already owns the name, the description, the phone and the cover photo.
`Catalogue` was the alternative, and owns the dishes and their prices, but not
whether a public page draws them.

**Two commands, two events.** `ShowCartePrices` / `HideCartePrices` →
`CartePricesShown` / `CartePricesHidden`, both with empty payloads. This is the
idiom `CloseMarketDay`/`ReopenMarketDay` and `MarkItemAsSoldOut`/
`MarkItemAsAvailable` already use, rather than one setter carrying a boolean:
events name facts. They sit behind **one idempotent `PUT /storefront/carte-prices
{ visible }`**, which is equally the availability pair's shape — a vendor flips a
switch to state the choice they want, and a re-statement is a domain no-op.

The aggregate folds the pair into one private change, because the guards are
identical and the two no-op rules are each other's negation; keeping them apart
had already let `assertOpen` drift onto one and not the other.

**Opted in, expressed as the absence of an event.** `Storefront` initialises
visible, and `ShowCartePrices` on a storefront that never hid raises nothing.
No event is written at open time — ADR 0009 gives one event per command, and a
default that needs writing down is not a default. Migration 0019 says the same
thing in the schema with `DEFAULT true`, so every row predating the column reads
the way the aggregate reads an empty stream. **No backfill anywhere.**

**A priced carte quotes the catalogue price.** It is the only price a carte can
name, and 0052's reasoning survives intact as the reason the *market's* list
stays with the market.

**The carte only.** The featured *Prochain marché* card is untouched: that price
is the market's own (`MARKET-PRICING-PLAN.md` decision 11), and this choice
speaks for the carte. A vendor who hides carte prices is told so on the spot,
because it is the one surprise the switch can cause.

**The reads carry the choice, not its consequence.** `CustomerStorefront` gains
`cartePricesVisible`; every price stays in the payload either way, and
`storefront-view-model.ts` is the single place that decides whether a label is
built. 0052 ended by noting that the query "keeps sending every price it always
sent, so the day a price belongs on the carte again, it is already there" — this
is that day, and nothing had to be added to the query to make it work.

## Consequences

- **Every existing storefront starts quoting its carte** the moment the read
  side ships, with no vendor action. That is what "opted in" means and it was
  chosen deliberately: a priced carte is the ordinary case, and the vendor who
  disagrees turns it off in one tap.
- **The French display question 0052 closed by showing nothing reopens** for any
  vendor who opts in — but what they publish is then their own catalogue price,
  which is the same standing they already have for every other figure they
  print. It is no longer a number the product invented.
- **0052's orphan-override condition still holds.** That ADR's deferred section
  leans on "nothing else reads a price list at all now that the carte quotes
  none", so that every reader of a price list filters through schedules. A
  priced carte reads no price list — it quotes catalogue prices — so it adds no
  reader that could skip the filter.
- The vendor-storefront read model is the single feed for both the vendor's own
  screen and the customer storefront, so one projection handler pair, one
  column, and one migration serve both.

## Rejected

| Option | Why not |
|---|---|
| `SetCartePriceVisibility(visible: boolean)` — one command | An event should name what happened. The two other booleans in this domain are both command pairs, and the boolean survives only where it belongs: in the HTTP body, and in one private method on the aggregate |
| Owning the choice on `Catalogue` | The carte page *is* the catalogue, which makes it tempting, but the catalogue owns dishes and prices — not whether a public page draws them. Storefront already owns what the vitrine publishes |
| Stripping prices from `CustomerStorefront` when hidden | A stronger reading of "hidden", and it would keep the figures off the wire entirely. Rejected because it puts the rule in the query handler rather than the view model, and leaves the frontend unable to tell "hidden" from "unpriced" — 0052 deliberately kept the payload whole for exactly this return |
| An event at storefront open recording the default | ADR 0009: one event per command, and `OpensStorefronts` raises `StorefrontOpened` alone. A default that must be written down stops being a default the moment a stream predates it |

Builds on ADRs 0008, 0009, 0039, 0045, 0046, 0052.

Shape and slicing: `docs/MARKET-PRICING-PLAN.md` (decision 12, slice 10).
