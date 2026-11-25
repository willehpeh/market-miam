# 0066. Ordering is a context on the shared log, asking Market Days through published queries

Date: 2026-11-15 · Status: Accepted

Amends ADR 0048 (Ordering named as a further context, with no design until it was real). Builds on
ADRs 0015, 0027, 0030, 0035, 0036, 0051, 0052 and 0058.

## Context

Ordering is decided (`docs/ORDERING-PLAN.md`, the ordering board): customers order and pay from a
live market day's menu, the vendor confirms each order, and the customer collects with a code.
ADR 0048 placed it as a context of its own, where the vendor is the merchant, with no design until
it was real. It is real now.

Everything Ordering will need from Market Days is a question about now: is the day open, what is
on its menu and at what price, what is sold out, when does it end, was it closed by hand. The
storefront already answers those questions from Market Days' read side, from one derivation of
the day's phase, hours and prices (ADRs 0027, 0051 and 0052).

## Decision

**Ordering is a bounded context on the single events table**, depending on `event-sourcing`,
`shared-kernel` and `common` only (enforced by ADR 0070).

**It asks Market Days through published queries, never its log.** Ordering declares the ports it
needs in its own words, and the api implements them over narrow queries Market Days publishes for
it, built on the same derivations the storefront uses, so the two can never disagree. A named
query is ADR 0048's published contract made concrete: Market Days knows what it has promised not
to break.

**One event crosses: the vendor's erasure**, the one Market Days fact Ordering reacts to rather
than asks about (ADR 0058).

**The dependency points one way.** Ordering asks Market Days; Market Days never asks Ordering.
Where a screen needs both, the frontend combines them, or an api controller at most.

**Reads are eventually consistent, and that is accepted.** A dish sold out a moment before an
order's card is held can slip through. The vendor confirms every order, so a slip ends as a refusal
and an uncharged hold.

**The log is the queue.** Polling subscriptions (ADR 0015), poked by LISTEN/NOTIFY (ADR 0030), with
checkpoints advanced by compare-and-set (ADR 0036), and Stripe's own retries in front of the
webhooks, do what a broker would. A broker would be a second place facts live, kept in step by an
outbox, which is the log again. The question reopens with the first of:

- notice lag that splitting the processor by account does not cure (ADR 0067);
- delayed work that a polled deadline cannot carry, where a queue inside Postgres, whose enqueues
  commit with the append (ADR 0035), comes before a broker;
- per-event dead-lettering, already deferred until the first poison event.

## Consequences

- The day's phase, hours and prices are derived once, in Market Days: the storefront and Checkout
  read the same answer.
- Market Days gains queries it promises to keep, each added when an Ordering spec first needs it.
- The vendor's erasure becomes a published event, its shape a promise to Ordering.
- A screen that needs both contexts makes two calls.

## Rejected

| Option | Why not |
|---|---|
| Ordering projects Market Days' events into its own read models | It would redo the phase, local-time and pricing logic, and the first time the copies differ the storefront shows one price and Checkout charges another. It freezes much of Market Days' events as a contract, for runtime independence one deployable on one database doesn't need |
| Ordering loads Market Days' aggregates | Strongly consistent, but it binds Ordering to Market Days' write model |
| Market Days' queries carry Ordering's state | The dependency would point both ways |
| A message broker | A second store of facts and a dual write, for a need the log meets |

## Amendment (2026-11-25): the live day, read from the log

- **Placing an order asks Market Days for the live day, which reads the day's own events.** The
  storefront's projection can lag behind the vendor's last tap, and an order judged against it
  could slip a dish sold out a moment before. `FindLiveMarketDay` folds the day's stream on each
  call, takes its hours from the schedule view and its phase from the same derivation the
  storefront uses, and answers no day when no schedule covers the date.
- **The api's adapters are Ordering's anti-corruption layer.** Ordering's ports speak its own
  words; the adapter beside each one turns Market Days' answer into them, and is the only code
  that sees both. `MarketDaysTradingDays` turns the live day into a trading day: Market Days'
  `over` and `past` phases into ended, and no day into one that refuses every order as closed.
