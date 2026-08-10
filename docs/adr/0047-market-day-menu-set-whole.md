# 0047. A market day's menu is set whole — one command, one event

Date: 2026-08-10 · Status: Accepted

Records decision 2 of `MENU-DU-JOUR-PLAN.md`, settled by grilling before
slice 1 and implemented in commits `8ad0f2a`–`d273bcc`.

## Context

The first cut of market-day planning was incremental: `PlanItemsForMarketDay`
and `UnplanItemFromMarketDay`, each raising its own event, with a `PlannedItem`
carrying a `Quantity`. That shape answers a question the product does not ask.
A vendor composes a day's offering in one sitting — tick dishes, save — and
what the storefront renders is the day's menu, not a history of additions and
removals. Quantity had no consumer anywhere.

Two facts made the moment cheap: no production events of the incremental
shapes existed, so retiring them needed no migration and no upcast; and the
catalogue had already set the precedent with `ItemsReordered`, which carries
the whole ordering rather than a move-from/move-to.

## Decision

- **One command, `SetMarketDayMenu`, carrying the whole set** of item ids for
  one (vendor, market, date); one event, `MarketDayMenuSet`, carrying the same
  (one event per command, ADR 0009). Plan/unplan commands, their events,
  `PlannedItem`, `Quantity` and `InvalidQuantityError` were deleted.
- **The array is a set.** The `Menu` value object dedups on construction;
  an unchanged menu raises no event; display order is the catalogue's
  (query-time concern, decision 3 — the payload stays thin).
- **Clearing is an empty set**, not a delete: `SetMarketDayMenu` with
  `itemIds: []` is legal and distinct from a day never planned. HTTP follows
  (slice 4): `PUT …/menu` with `{ itemIds: [] }`, no `DELETE` route.
- **Sold-out follows the set**: applying `MarketDayMenuSet` drops sold-out
  marks for dishes no longer on the menu.

## Consequences

- The projection is an idempotent whole-row upsert — replay-safe by
  construction, which is what lets the read model rebuild by clear-and-rewind
  (0010 pattern, migration 0013).
- Concurrent edits of the same day need no merge semantics: the day is one
  stream, optimistic concurrency turns the race into a 409 (ADR 0045), and
  the retry sends a whole set again.
- The log records states, not intents: "the menu became X", never "Y was
  added". Accepted — nothing renders a past menu, and a future event with
  per-item meaning (the three-outcomes sale event) will carry its own
  snapshot rather than leaning on menu history (decision 3).
- Editors must send the whole set, so a stale editor can silently drop a
  dish another session added. Accepted structurally, not provisionally: the
  contention surface is one vendor's one day, a vendor is at most two or
  three people, and simultaneous edits of the same day's menu are
  vanishingly rare — odds that do not change as the platform gains vendors.
  The 409 turns a genuinely simultaneous save into a retry.
- Quantity is gone from the domain. If stock ever matters, it returns as its
  own concept with its own consumer, not as a field riding the menu.
