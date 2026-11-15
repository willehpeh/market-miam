# 0066. Ordering is a context on the shared log, asking Market Days through published queries

Date: 2026-11-15 · Status: Accepted

Amends ADR 0048 (Ordering named as a further context, with no design until it was real). Builds on
ADRs 0005, 0006, 0015, 0016, 0027, 0030, 0035, 0036, 0051, 0052 and 0058.

## Context

Ordering is decided (`docs/ORDERING-PLAN.md`, the ordering board): customers order and pay from a
live market day's menu, the vendor confirms each order, and the customer collects with a code.
ADR 0048 placed it: a context of its own, where the vendor is the merchant, apart from Billing,
with no design until it was real. It is real now, and its first slice, the vendor's payment
account, needs three things settled first.

**What Ordering needs from Market Days.** Every need is a question about now, never a reaction:

| When | Ordering asks |
|---|---|
| A Checkout opens, recording nothing (board, R1) | Is the day today and open? Which dishes are on its menu, at what price, which are sold out? When does it end? |
| Stripe holds the card | The same again: a dish sold out, or the day closed or ended, refuses the order |
| An order waits for the vendor | The day's end, which caps the 10 minutes |
| The day's end | Was it closed by hand and not reopened? That decides a refund over a no-show |

Ordering knows which days have orders, so it never needs Market Days' log to find them. The
storefront already answers these questions from Market Days' read side, from one derivation:
`FindUpcomingMarketDays` gives each day's phase "by the clock alone… same clock as the aggregate's
today-guard", its hours, whether it is closed, and its menu with current names and prices. Local
time (ADR 0027), the market's hours (ADR 0051) and prices by market (ADR 0052) are worked out
there, once.

**Which way the dependency points**, since screens will want both contexts at once.

**Whether a message broker belongs beside the log**, once Stripe's webhooks and an order's timers
arrive.

## Decision

**Ordering is a bounded context, `packages/ordering`**, on the single events table and its global
position, as ADR 0048 put Billing. It depends on `event-sourcing`, `shared-kernel` and `common`
only. Its streams and event types sit under `ordering-`, so nothing collides in the one table.

**It asks Market Days through published queries, and never reads its log for state.**

- Ordering declares ports in its own words; `apps/api` implements them over queries Market Days
  publishes for Ordering. Ordering's specs use fakes of its own ports (ADR 0006).
- Each published query is narrow and named, built on the same derivations the storefront uses.
  That is ADR 0048's published contract made concrete: Market Days knows exactly what it has
  promised not to break. The first answers whether a vendor's storefront is published
  (ADR 0068). The next, with the orders, answers a market day's phase, whether it is closed, its
  end, and its dishes with their prices and sold-out state.
- Not `FindUpcomingMarketDays`, which is shaped for the vendor's screens, bilan fields and all.

**One event crosses: `VendorErased`.** Erasure is the one Market Days fact Ordering reacts to
rather than asks about (ADR 0068). It joins the published events of ADR 0048.

**The dependency points one way.** Ordering asks Market Days; Market Days never asks Ordering. What
a screen needs from both, the storefront's "can I order here?" or the vendor's warning before
closing with paid orders not collected, the frontends combine, or an api controller at most.
`CloseMarketDay` and `EraseVendor` stay unaware of orders.

**Reads are eventually consistent, and that is accepted.** Market Days' views lag its log by a
poll, so a dish marked sold out a moment before an order's card is held can slip through. The
vendor confirms every order, so a slip ends as a refusal and an uncharged hold.

**Orders are taken while the day trades.** Only in the `trading` phase, the market's hours, not in
`due`: an order at 6 a.m. for an 8 a.m. market would most likely time out while the vendor sets
up. Opening earlier can come if vendors ask.

**The price recorded is the one Stripe holds.** Checkout prices from the published query at that
moment; `OrderPlaced` records Stripe's line items, fetched when the card is held, so a price changed
in between never reaches the order.

**The log is the queue.** Polling subscriptions (ADR 0015), poked by LISTEN/NOTIFY (ADR 0030), with
checkpoints advanced by compare-and-set (ADR 0036), and Stripe's own retries in front of the
webhook, up to three days in live mode, do what a broker would. A broker would be a second place
facts live: every append would need an enqueue, and an outbox to keep the two in step, which is
the log again. The question reopens with the first of:

- notice lag on the account processor (ADR 0067) that splitting it by account does not cure;
- delayed work, the acceptance timeout or the day's end, that a polled deadline column cannot
  carry. A queue inside Postgres, whose enqueues commit with the append (ADR 0035), comes before
  a broker;
- per-event dead-lettering, already deferred until the first poison event.

## Consequences

- The phase, the hours, local time and the prices are derived once, in Market Days: the storefront
  and Checkout read the same answer.
- Market Days gains query handlers it promises to keep, and `apps/api` gains the adapters that map
  them onto Ordering's ports.
- Step 1 needs one answer from Market Days, whether the storefront is published; the orders need
  the rest.
- The storefront and the vendor app make a second call, to Ordering, where they need its state.
- A dish sold out moments before an order is caught by the vendor, not by the server.
- `VendorErased` becomes a published event, its shape a promise to Ordering.

## Rejected

| Option | Why not |
|---|---|
| Ordering projects Market Days' events into its own read models | It would redo the phase, local-time and pricing logic, and the first time the copies differ the storefront shows €8.50 and Checkout charges €9. It freezes a large share of Market Days' events as a contract, for runtime independence one deployable on one database doesn't need |
| Ordering loads Market Days' aggregates | Strongly consistent, but it binds Ordering to Market Days' write model |
| The adapters read `FindUpcomingMarketDays` | Shaped for the vendor's screens; Market Days couldn't tell what Ordering relies on |
| Market Days' storefront query carries ordering's state | The dependency would point both ways |
| Orders from the `due` phase | The vendor is rarely at the stall to accept within 10 minutes |
| A message broker | A second store of facts and a dual write, for a need the log meets |
