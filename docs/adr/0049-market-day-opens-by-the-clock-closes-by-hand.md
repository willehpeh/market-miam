# 0049. A market day opens by the clock, closes by hand

Date: 2026-08-12 · Status: Accepted

## Context

Live mode (*en direct*) leads the customer storefront with the market the vendor
is trading at right now. The obvious model is a symmetric lifecycle —
`MarketDayOpened` / `MarketDayClosed` — which is what `NEXT_BEHAVIOURS.md`
carried as "open market day · close market day".

Liveness is already derivable. `hasStarted` / `notYetEnded`
(`market-schedule-view/market-day-clock.ts`) compute it from the schedule's
`startTime` / `endTime`, and the customer market card has badged **En cours**
from that since the menu du jour work.

What an explicit open would buy is **presence** — evidence a human is at the
stall, which a clock cannot know.

## Decision

**No `MarketDayOpened`.** A market day is live when its schedule says it is
running, it has a non-empty menu, and it has not been closed.

**Closing is explicit**: `MarketDayClosed`, mirrored by `MarketDayReopened`.

## Consequences

- The failure modes are asymmetric, and that is the whole argument. A forgotten
  *open* tap silently kills the feature during the exact window it exists for. A
  forgotten *close* leaves the behaviour that already shipped: the day ends at
  `endTime`.
- A vendor who plans a menu the night before gets a live storefront without
  touching their phone. There is no "go live" button, so nothing to onboard and
  nothing to forget.
- **The page cannot claim presence.** *On est au marché* is inferred from the
  schedule, so a vendor whose van broke down reads as trading until `endTime` or
  until they close. Accepted: the alternative fails silently and more often.
- `MarketDayClosed` acts as an early `endTime` — `notYetEnded` consults it, so one
  rule serves the whole read side rather than a parallel live-state concept.
- Closing is the hook the post-market three-outcomes review hangs off. There is
  no opening hook, and nothing has asked for one.
- Closing must be reversible, since a vendor who closes at 10h30 and then serves
  a straggler has otherwise ended their day publicly. Hence `MarketDayReopened`,
  and the vendor's own query keeps a closed day until `endTime` so something can
  still reach it.

Shape and slicing: `docs/LIVE-MODE-PLAN.md`.
