# W4 — Nested `transaction()` silently opens a second, independent transaction

| | |
|---|---|
| Severity | Medium-High |
| Area | Persistence seam |
| Files | `packages/event-sourcing/src/adapters/postgres/postgres.unit-of-work.ts:18-31` (at `eec797b`) |
| Status | **Fixed** — see [Fix](#fix-2026-08-01) below; decision recorded in [ADR 0037](../adr/0037-nested-transactions-join-the-ambient-unit-of-work.md) |
| Found | 2026-07-31 evaluation @ `eec797b` |
| Reviewed | 2026-08-01 — core claim confirmed still live after the W2 fix; evidence and the W2 relation corrected (see [Review](#review-2026-08-01)) |

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

## Review (2026-08-01)

The core claim held against the post-W2 code: `transaction(fn)` still
unconditionally acquired a client and opened its own transaction, so a nested
call still got a second connection, a replaced ALS scope, and an independent
commit. Three parts of the finding had gone stale or needed correction:

- **The W2 relation resolved the other way round.** W2 was fixed *without*
  fixing W4 first: [ADR 0035](../adr/0035-appends-join-the-ambient-unit-of-work.md)
  added `inTransaction(work)`, which joins the ambient transaction — sidestepping
  nested `transaction()` entirely rather than depending on it. This finding was
  not, in the end, a prerequisite.
- **That fix strengthened this finding.** After W2, the same class answered
  "what does nesting mean" two contradictory ways: `inTransaction` joined,
  `transaction()` opened an independent second transaction. The inconsistency
  made the footgun sharper than at `eec797b`, and it also settled the
  suggested-fix choice — option 2 (throw) would have preserved the split
  semantics ADR 0035 had already decided against.
- **The evidence section was stale.** A direct spec
  (`test/src/event-sourcing/postgres-unit-of-work.spec.ts`) landed with the W2
  fix, pinning commit/rollback/verified-COMMIT and both `inTransaction` cases —
  but nested `transaction()` remained unpinned, exactly the gap this finding
  named.

One caveat the review adds: no nested `transaction()` call site actually exists
in the codebase — the only callers are `PollingSubscription.poll()` and
`Subscriptions.rebuild()`, and everything inside their scopes enlists via
`Queryable` or `inTransaction`. The hazard was latent, which argues the
severity toward plain Medium; it stays worth fixing because the polling path
wraps *every* handler invocation, so the trap sat one refactor away from every
projection and processor.

## Fix (2026-08-01)

Option 1 from the suggested fix, implemented as a one-line delegation:
`transaction(fn)` now routes through `inTransaction(() => fn())`, so the
placement decision — join the ambient transaction, or own a fresh
BEGIN / verified COMMIT / ROLLBACK — lives once, in the seam the W2 fix
already built. An outer rollback discards inner work; durability is decided
exactly once, by the owner's verified COMMIT (ADR 0034); and inner failures
abort the shared transaction provided the error propagates or a SQL statement
failed — the one remaining gap (a pure-JS inner throw swallowed by an outer
catch commits the inner scope's partial writes) is stated and accepted in the
ADR, unreachable without a call shape the codebase doesn't contain. Rationale
and rejected alternatives (throw, savepoints, rollback-only marking) are in
[ADR 0037](../adr/0037-nested-transactions-join-the-ambient-unit-of-work.md).

The regression tests suggested above are pinned in the fast
`postgres-unit-of-work.spec.ts`: (a) nested `transaction()` — one connection,
one BEGIN/COMMIT, and inner work discarded by an outer throw; (b) `query()`
outside any transaction routes to the pool (and to the transaction's client
inside one); (c) release-on-error was already pinned by the spec's
`releasedTimes()` assertions. What was correct before the fix and did not
regress: connection release on every path, and the ROLLBACK that swallows its
own error.
