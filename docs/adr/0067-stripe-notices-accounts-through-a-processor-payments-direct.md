# 0067. Stripe's notices: accounts through one processor, payments direct, the first event the gate

Date: 2026-11-15 · Status: Accepted

Amends ADR 0009 (streams named after the vendor): a notice's stream is named after Stripe's event.
Closes `docs/archive/DEFERRED.md`'s *Client-supplied idempotency*. Builds on ADRs 0005, 0015, 0036
and 0066.

## Context

Stripe's outcomes enter Ordering's log only through webhooks (board, R2), and Stripe delivers them
at least once and in no set order. Accounts v2 sends thin events: Stripe's event ID and the
account's ID, no state. Stripe recommends thin events for new integrations, says to fetch the
latest state before acting even on a snapshot, and has a thin form of every payment event the
board needs.

**Fetching races.** Two notices for one account, at two instances, each fetch, and the staler
write can land last. Optimistic concurrency on the vendor's stream nearly fences it, since a stale
writer that loses the append reloads and fetches again. It fails when a check finds nothing to
record:

1. The record says card payments are active.
2. Instance A loads it, fetches while card payments are briefly off, and stalls.
3. Stripe turns them back on. Instance B loads, fetches, finds nothing changed, records nothing.
4. A wakes and records them off, without conflict, since nobody wrote after it loaded.

**Accounts and payments differ.** An account's state goes both ways: card payments stop and start,
issues open, close and reopen. An order's only moves forward: held, then taken or released;
refunds add up; a dispute opens, then closes.

## Decision

**Account notices are recorded first, then read in order by one processor.** The webhook checks
Stripe's signature and records the notice, calling nothing and looking up no vendor. One processor
reads notices in log order, and ADR 0036 lets one instance commit each, so fetch-then-write runs
one at a time and a later fetch is the fresher. It fetches the account and records what changed.
It uses nothing from a notice but the account's ID: whatever order notices arrive in, the notice
for Stripe's last change is fetched after that change, and the record ends at Stripe's state.

**Payment events go direct, once orders exist.** An order only moves forward, so it absorbs late
and repeated events by recording nothing, and refuses early ones, which Stripe delivers again. No
notice, and no single processor, in the busiest path.

**A stream keyed on the identity the outside world sends back, its first event the gate.** A
notice's stream is named after Stripe's event: a replay finds its first position taken (ADR 0005)
and records nothing. This closes `DEFERRED.md`'s *Client-supplied idempotency*; its general front
gate waits for a key supplied by a browser with no stream to name.

**Notices are transport, not facts.** No projection reads them. They are recorded so the processor
can read them in order, and could move to a work queue if the api ever has one (ADR 0066).

**Events record what we saw, not Stripe's history.** A change undone between two fetches goes
unrecorded, and a recorded change is timed by our clock. Stripe keeps its own history.

**One processor, for now.** Account notices come a dozen or two per onboarding. If its lag shows in
Honeycomb, split it by account.

## Consequences

- A replayed notice costs a 200. A repeat that got past the gate would cost one fetch that records
  nothing.
- Each account change costs two appends, the notice and the outcome: negligible.
- Payments never queue behind one processor.
- Stripe's docs don't say whether a fetch made just after a thin event always shows that event's
  change. The message to Stripe support carrying Q5 and Q14 asks. If it can lag, a re-check of
  accounts not yet able to take payments joins.
- An early payment event waits on Stripe's backoff, an hour or more in live mode. A sandbox retries
  three times over a few hours, so a test that provokes one can lose it.

## Rejected

| Option | Why not |
|---|---|
| Account snapshots applied directly | A late snapshot overwrites a fresher one, with nothing to order them by |
| The webhook fetches the account and writes to the vendor's stream | The race above: optimistic concurrency fails when a check records nothing |
| Every Stripe event through notices and one processor | At a Saturday noon rush, payments would queue behind it, each waiting on a fetch |
| A table of received Stripe event IDs | A table and a migration for what a stream's first position already does |
| Notices in an inbox table outside the log | The better model, since notices aren't facts, but a second way of reading and per-account order to re-solve, for a dozen notices per onboarding |
| A message broker | ADR 0066 |
