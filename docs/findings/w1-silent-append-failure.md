# W1 — A failed INSERT yields a successful `append()`

| | |
|---|---|
| Severity | **Critical** |
| Area | Write path |
| Files | `packages/event-sourcing/src/adapters/postgres/append-transaction.ts:29`, `packages/event-sourcing/src/adapters/postgres/postgres.event-store.ts:20-23` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

`AppendTransaction.append` fires its INSERTs without awaiting them:

```ts
async append(events, expectedStreamPosition, metadata) {
  await this.performConcurrencyCheck(expectedStreamPosition);
  events.forEach((event) => this.appendEvent(event, metadata));   // appendEvent is async — promises dropped
}
```

`PostgresEventStore.append` then awaits `txn.commit()`. Ordering is accidentally
safe — `client.query()` is called synchronously inside the `forEach`, so pg's
per-client queue serialises the INSERTs ahead of the queued `COMMIT`. The error
path is not safe, and it is worse than an ordinary unhandled rejection: Postgres
resolves `COMMIT` on an already-aborted transaction **successfully**, returning
a `ROLLBACK` command tag instead of raising. So when any INSERT fails, the
`try/catch` in `postgres.event-store.ts:24-26` never fires, `append()` returns
normally, and the dropped INSERT rejection escapes as an `unhandledRejection`.

## Failure scenario

Any INSERT failure mid-batch — a unique violation on
`(stream_id, stream_position)` from a concurrent writer that slipped past the
count-based check, a jsonb serialisation error, a connection dropped mid-batch:

1. The INSERT rejects; the transaction enters the aborted state. Subsequent
   INSERTs in the batch reject with `25P02 current transaction is aborted`.
2. `COMMIT` resolves (as `ROLLBACK`); `append()` resolves; the command handler
   returns success; the HTTP response is 2xx.
3. **Zero events were written.** The aggregate's caller believes N events are
   durable.
4. Separately, the dropped rejections fire `unhandledRejection`, whose Node ≥15
   default terminates the process — so the observable outcome is a race between
   silent data loss and a hard crash, possibly after the success response was
   already sent.

## Evidence

Confirmed with a runnable repro (stub pg client encoding exactly the documented
pg/Postgres semantics above — BEGIN/lock/count succeed, INSERT rejects,
follow-up INSERT rejects with 25P02, COMMIT resolves with a ROLLBACK tag):

```
append() RESOLVED — caller believes 2 events are durable
unhandled rejections that escaped append(): 2
  - insert failed (e.g. unique_violation)
  - 25P02 current transaction is aborted
```

Caveat, stated honestly: the repro proves the adapter's behaviour *given* those
COMMIT semantics; it was not demonstrated against a live Postgres (no Docker in
the evaluation environment). The semantics themselves are standard, documented
Postgres behaviour.

Why no test caught it: the Postgres adapters sit entirely outside the mutation
net ([T1](t1-test-and-ci-blind-spots.md)), and the container specs never inject
an INSERT-level failure — `eventStoreContract` exercises the concurrency check,
which throws *before* the INSERT stage and therefore takes the healthy rollback
path.

## Suggested fix

Await the inserts sequentially (order matters for `stream_position`):

```ts
async append(events, expectedStreamPosition, metadata) {
  await this.performConcurrencyCheck(expectedStreamPosition);
  for (const event of events) {
    await this.appendEvent(event, metadata);
  }
}
```

This converts every failure above into a rejection from `txn.append(...)`, which
the existing `catch → rollback → rethrow` in `postgres.event-store.ts:24-26`
already handles correctly. No other change is needed.

Regression test to pin it: a container spec that makes one INSERT of a
multi-event batch fail (e.g. a payload the column rejects, or a seeded row
violating `(stream_id, stream_position)`) and asserts `append()` **rejects** and
the stream is unchanged. The existing contract already asserts
nothing-persisted-on-`ConcurrencyError`; this adds the same guarantee for
INSERT-stage failures.
