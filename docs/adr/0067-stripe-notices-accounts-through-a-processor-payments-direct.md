# 0067. Stripe's notices: accounts through one processor, payments direct, the first event the gate

Date: 2026-11-15 · Status: Accepted

Amends ADR 0009 (streams named after the vendor): a notice's stream is named after Stripe's event.
Closes `docs/archive/DEFERRED.md`'s *Client-supplied idempotency*. Builds on ADRs 0005, 0015, 0028,
0030, 0036, 0046 and 0066.

## Context

Stripe's outcomes enter Ordering's log only through webhooks (board, R2): an account's status, a
card held, a payment taken, a hold released, a refund, a dispute. Stripe delivers at least once and
in no set order, and says so: don't depend on "receiving events in a specific order", and "track
event IDs to identify duplicate deliveries".

**Every notice means "look".** Accounts v2 sends thin events: Stripe's event ID and the account's
ID, no state. Stripe recommends thin events for new integrations, and says a snapshot "can be stale
by the time your application processes it, fetch the latest version of the resource from the API
before acting on the data". Every payment event the board needs exists in thin form:
`v1.checkout.session.completed`, `v1.payment_intent.succeeded`, `v1.payment_intent.canceled`,
`v1.charge.expired`, `v1.charge.refunded`, `v1.charge.dispute.created` and `.closed`.

**Fetching races.** Two notices for one account, at two instances, each fetch; the staler write can
land last. Optimistic concurrency on the vendor's stream nearly fences it, since a stale writer that
loses the append reloads and fetches again. It fails when a check finds nothing to record:

1. The stream says *Enabled*.
2. Instance A loads it, fetches while card payments are briefly off, and stalls.
3. Stripe turns them back on. Instance B loads, fetches *Enabled*, records nothing.
4. A wakes and appends *Disabled* without conflict, since nobody wrote after it loaded.

**What separates accounts from payments.** An account's state goes both ways: card payments stop
and start, issues open, close and reopen. An order's only moves forward: held, then taken or
released; refunds add up, each with its own ID; a dispute opens, then closes.

## Decision

**Account notices are recorded, then read by one processor.**

- The accounts destination's route, `POST /api/webhooks/stripe/accounts`, checks Stripe's signature
  (ADR 0069), then the payload's shape (ADR 0046), and appends
  `PaymentAccountUpdateDetected { stripeEventId, accountId }` at position 0 of
  `ordering-stripe-notice-{stripeEventId}`. It calls nothing and looks up no vendor.
- A replay finds that position taken: the append raises `ConcurrencyError` (`UNIQUE (stream_id,
  stream_position)`, ADR 0005), and the route answers 200 having recorded nothing.
- One processor, `ChecksPaymentAccounts`, reads notices in log order, and ADR 0036 lets one
  instance commit each, so fetch-then-write runs one at a time and a later fetch is the fresher. It
  fetches the account, with the merchant configuration and the requirements included, reads the
  vendor from its metadata, and sends one command per aspect (ADR 0068). A notice for an account
  with no vendor in its metadata, one made by hand in Stripe's dashboard, is logged and skipped.
- The processor uses nothing from a notice but the account's ID. Its type, its timestamp and its
  place in the log decide nothing; the fetch does. Whatever order notices arrive in, the notice for
  Stripe's last change is fetched after that change, and the recorded state ends at Stripe's.

**Payment notices go direct, once orders exist.** The payments destination's route fetches what it
needs, the session with its line items for the first event and the PaymentIntent after it, and
sends a command to the order's stream, found by the order ID placed in the PaymentIntent's
metadata. The stream's first position gates the order's first event, and its state machine the
rest: a late event finds the order past it and records nothing; an early one, a refund before
"payment taken" has landed, is refused, and Stripe delivers it again. Personal data from the fetch
goes straight into the order's events, sealed under the day's key; nothing raw is recorded.

**The rule, for both and after: a stream keyed on the identity the outside world sends back, its
first event the gate.** This closes `DEFERRED.md`'s *Client-supplied idempotency*: its general
front gate is not built, and comes back only if a key supplied by a browser ever needs one.

**Notices are transport, not facts.** They have their own namespace, no projection reads them, and
they are recorded only so the processor can read them in order. If the api ever has a work queue
(ADR 0066), they can move there; old ones are dead once read, so nothing would migrate.

**Events record what we saw, not Stripe's history.** An issue opened and resolved between two
fetches is never recorded. `PaymentAccountDisabled` means "seen disabled", timed by our clock when
we looked. Stripe keeps its own history: 30 days of events in its API, 13 months of summaries in
Workbench.

**One processor, for now.** Account notices come a dozen or two per onboarding. If their lag shows
in Honeycomb, split them by account: N checkpointed processors, each taking a hash of the account
ID modulo N.

**One route and one signing secret per event destination.** Stripe files v2 account events under
*Your account* and direct-charge events under *Connected accounts*, so accounts and payments arrive
on separate destinations: `/api/webhooks/stripe/accounts` now, `/api/webhooks/stripe/payments`
with the orders. Both are public, and the signature is their only guard.

## Consequences

- A replayed notice costs a 200. A repeat that got past the gate would cost one fetch: the commands
  compare, and record nothing.
- Each account change costs two appends, the notice and the outcome. Negligible at a dozen or two
  per onboarding.
- Payments never queue behind one processor: each webhook works on its own instance.
- Stripe's docs don't say whether a fetch made just after a thin event always shows that event's
  change. The message to Stripe support that carries Q5 and Q14 asks. If it can lag, a re-check of
  accounts not yet able to take payments joins; until then, the board's manual net stands (the
  registration screen's "get in touch if nothing happens within 10 minutes").
- An early payment event waits on Stripe's backoff, an hour or more in live mode. A sandbox retries
  three times over a few hours, so a test that provokes one can lose it.
- Alerts: notice lag, the trigger for splitting the processor; and the stuck-subscription alert,
  which already covers a processor that stops.

## Rejected

| Option | Why not |
|---|---|
| Account snapshots applied directly | Unordered snapshots of a state that goes both ways: a late one overwrites a fresher one, with nothing to order them by (`created` is in seconds, and Stripe says not to) |
| The webhook fetches the account and writes to the vendor's stream | The race above: optimistic concurrency fails when a check records nothing |
| Every Stripe event through notices and one processor | Payments would queue behind it: about 7 notices a second at the plan's 500-vendor Saturday noon, each waiting on a fetch of a few hundred milliseconds |
| Payments as snapshots, applied without a fetch | The first needs the line items, which `checkout.session.completed` leaves out, and Stripe says to fetch before acting anyway |
| A table of received Stripe event IDs | A new table and migration for what a stream's first position already does |
| An event ID derived from Stripe's, gated by `UNIQUE (id)` | `serialized-append.ts` mints the IDs; the store would change |
| Notices in an inbox table outside the log | The better model, since notices aren't facts, but it needs a second way of reading (claiming, retrying, its own stuck alert) and re-solving per-account order, which the processor gives for free, for a dozen notices per onboarding |
| A message broker | ADR 0066 |
