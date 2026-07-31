# W4 — Nested `transaction()` silently opens a second, independent transaction

| | |
|---|---|
| Severity | Medium-High |
| Area | Persistence seam |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.unit-of-work.ts:18-31` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

`PostgresUnitOfWork.transaction(fn)` unconditionally acquires a pooled client,
issues `BEGIN`, and runs `fn` under `AsyncLocalStorage.run(client, …)`. A
*nested* call therefore:

- acquires a **second** client and opens a **second, independent** transaction;
- **replaces** the ALS store for the duration, so queries inside the inner scope
  route to the inner client;
- commits the inner transaction regardless of what the outer one later decides —
  an outer rollback does not undo inner work.

There are no savepoints, no join-the-ambient-transaction behaviour, and no
detection: the composition silently does the wrong thing rather than failing
loudly.

## Failure scenario

`PollingSubscription` already wraps every handler invocation in
`transaction()`, and `Subscriptions.rebuild()` wraps `reset()` +
`checkpoint.write(0)` in one too. Any projection, store adapter, or future
domain service that opens its own unit of work inside those scopes — a
perfectly reasonable-looking refactor — gets partial-commit semantics: its
writes survive a rollback that the caller believes covered them. The failure is
silent and only observable as data inconsistency after an error path runs.

What is *correct* today and should not regress while fixing this: connection
release is sound (`finally { client.release() }` on every path), and the
`ROLLBACK` swallows its own error so a dead connection cannot mask the original
exception (`postgres.unit-of-work.ts:26-30`).

## Evidence

Static: the method body at `postgres.unit-of-work.ts:18-31`. Test-side: no
direct spec for `PostgresUnitOfWork` exists anywhere in `test/` — nesting
behaviour is entirely unpinned (see [T1](t1-test-and-ci-blind-spots.md)). The
class is exercised only as a collaborator in
`transactional-projection.container.spec.ts`, which never nests.

## Suggested fix

Pick one of two behaviours and enforce it; either is defensible, ambiguity is
not:

1. **Join the ambient transaction** (recommended — matches what callers
   plausibly expect):
   ```ts
   async transaction<T>(fn: () => Promise<T>): Promise<T> {
     if (this.active.getStore()) return fn();   // already inside one — join it
     // …existing acquire/BEGIN/COMMIT/ROLLBACK path…
   }
   ```
   Inner failures then abort the shared transaction, which is the semantics the
   name promises. Savepoints can come later if partial rollback is ever needed.
2. **Refuse loudly**: throw `NestedTransactionError` when `getStore()` is
   non-null, forcing call sites to restructure.

Regression tests to pin it (a direct `PostgresUnitOfWork` container spec is
overdue regardless): (a) nested `transaction()` — inner write + outer throw →
**nothing** committed; (b) `query()` outside any transaction routes to the pool;
(c) release-on-error (assert the pool is not exhausted after N failing
transactions).

Related: [W2](w2-appends-bypass-unit-of-work.md) — wiring the event store
through the UoW makes processor appends *rely* on well-defined nesting
semantics, so this finding is a prerequisite for that fix's correctness.
