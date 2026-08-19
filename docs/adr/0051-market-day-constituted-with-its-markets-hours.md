# 0051. A market day is constituted with its market's hours

Date: 2026-08-19 · Status: Accepted

## Context

ADR 0049 made closing reversible. The limit on reopening — you cannot reopen a
day whose market has already ended — was never enforced by anything: a closed
day simply dropped out of the vendor's forward-looking window at `endTime`, so
no query returned it and no UI could reach it. Enforcement by absence.

Live mode removed that absence. `FindMarketDay(vendorId, marketId, date)` is a
point lookup with no temporal window, because the screen a vendor ran the market
on has to survive `endTime` and the post-market outcomes review lands on a day
that is already over. With the day permanently viewable, the limit needed a real
home.

The honest home is the write path — the aggregate is the thing that refuses. But
it cannot refuse with facts it does not hold: `endTime` belongs to `Calendar`,
a different aggregate on a different stream.

ADR 0031 met a cross-aggregate question and answered it with a domain service,
saying that reaching across boundaries "via injected interface or passed-in
aggregates" is what a service exists to own. This is a different question in
similar clothes, and the repo needs a rule for telling them apart.

## Decision

**`MarketDays` constitutes the day with the hours it decides on.**
`forVendorAtMarketOn` reads the day's stream and the vendor's `Calendar`
together and passes `calendar.hoursFor(marketId, date)` to the constructor, so
`reopen` raises `MarketDayEndedError` for itself. The hours arrive structurally
(`MarketHours = { endTime?: string }`), so the market day never imports the
calendar.

**Three shapes for a fact that lives in another aggregate, and how to choose:**

- **The repository constitutes** when the aggregate itself decides with the
  fact and any command might — small, stable, part of what the thing *is*.
  Hours, alongside today's date.
- **The handler passes** when one command needs it, validated against the
  sibling first. `SetMarketDayMenuHandler` loads `Catalogues`, confirms the
  ids and hands `setMenu` a `Menu`.
- **A domain service owns it** when the rule spans aggregates and belongs to
  none of them. `StorefrontPublication` (ADR 0031).

A day no schedule covers has no hours and runs to `23:59` — the fallback
`market-day-clock.ts` already applies to an untimed market. Nothing has ever
checked that a market day is scheduled, and the write path stays exactly as
incurious about unreal days as it has always been.

## Consequences

- **Every market-day command pays a calendar read.** Issued with `Promise.all`
  so it costs one round trip rather than two — the sold-out tap is the latency
  that matters.
- **Hours are read per command, never copied onto the day.** A vendor who moves
  their closing time to 14h at 09h can reopen at 13h — see
  `reopen-market-day.spec.ts`, *"reopens against amended hours"*.
- **ADR 0009 is preserved**: one aggregate mutated, one event. The calendar load
  is read-only, the same standing as 0031's sibling loads.
- **This is not calendar state off a read model.** `LIVE-MODE-PLAN.md` decision
  16 refused that, and still does; `Calendar` is an aggregate on its own stream,
  read strongly consistent on the write path.
- Both of the day's temporal facts — what today is, and what hours it runs to —
  arrive together, from the repository. The alternative was handing the hours to
  `reopen` as an argument, which puts the caller in charge of what the day is
  allowed to refuse.
- **Rejected: enforcing it on the screen alone**, which is an affordance
  described as a rule while the domain still permits the call. **Rejected:
  materialising occurrences behind a scheduled trigger** — it would supply the
  hours, but as infrastructure for one guard, and it turns every schedule
  amendment into a reconciliation of days already carrying menus, marks and
  closures. Revisit at pre-orders or reservations, where third-party data hangs
  off one specific day and the derived natural key stops being enough.
- A closed day is now the vendor's to view forever, while
  `FindUpcomingMarketDays` keeps its ended-day filter — so a finished day is
  reachable only through the point lookup.

Shape and slicing: `docs/LIVE-MODE-PLAN.md` (decisions 50, 57).
