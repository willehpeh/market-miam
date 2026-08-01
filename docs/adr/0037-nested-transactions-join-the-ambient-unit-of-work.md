# 0037. A nested transaction() joins the ambient unit of work

Date: 2026-08-01 · Status: Accepted

## Context

The W4 finding: `PostgresUnitOfWork.transaction(fn)` unconditionally acquired a
pooled client, issued `BEGIN`, and ran `fn` under a fresh `AsyncLocalStorage`
scope. A *nested* call therefore opened a second, independent transaction on a
second connection — and committed it regardless of what the outer transaction
later decided. An outer rollback did not undo inner work, silently: no error,
no savepoint, just partial-commit semantics observable only as data
inconsistency after an error path.

No nested call site exists today — `PollingSubscription.poll()` and
`Subscriptions.rebuild()` are the only `transaction()` callers, and everything
inside their scopes enlists via `Queryable.query` or `inTransaction`. But the
ADR 0035 fix made the trap sharper, not duller: since W2, `inTransaction`
(the append path) *joins* the ambient transaction while `transaction()` did
not, so the same class carried two contradictory answers to "what does nesting
mean". Any projection, store adapter, or domain service that wrapped its own
work in `transaction()` inside a subscription's per-event scope — a
reasonable-looking refactor — would get the wrong one.

## Decision

**Nesting joins.** `transaction(fn)` now delegates placement to the same seam
appends use: run `fn` inside the ambient transaction when one exists, or own a
fresh BEGIN / verified COMMIT / ROLLBACK when none does. One method —
`inTransaction` — owns the placement decision for the whole class.

Consequences of joining, all deliberate:

- An inner failure aborts the *shared* transaction **provided the error
  propagates to the owner or a SQL statement failed**. Stated precisely,
  because the remaining case is a real, accepted gap: a joined scope that does
  some writes and then throws a *pure JS* error (validation, a bug — no failed
  SQL) does not abort the Postgres transaction; if the outer caller catches
  that error and continues to a successful COMMIT, the inner scope's partial
  writes are durable despite the inner "transaction" having failed. Before
  this decision that scope owned its transaction and would have rolled itself
  back. The trade is deliberate: the old footgun (inner commits surviving an
  outer rollback) needed only a nested caller and was silent; this one needs a
  nested caller *plus* an outer that catches-and-continues across it, and
  neither exists today. The SQL-error half of the gap is closed by the
  ADR 0034 verified COMMIT — an aborted transaction's COMMIT resolves with a
  ROLLBACK tag and the owner throws. There is no partial rollback; savepoints
  can come later if a caller ever legitimately needs one (none does).
- Durability is decided exactly once, by the owner's verified COMMIT
  (ADR 0034). A joined `transaction()` returning successfully does **not**
  mean the work is durable — the outer commit decides later. This matches the
  observability caveat ADR 0035 already records for joined appends.
- Work that must survive an outer rollback keeps its existing escape hatch:
  stay pool-bound, as `PostgresDataKeys` deliberately does.

Rejected:

- **Refuse loudly** (`NestedTransactionError` when an ambient transaction
  exists) — defensible in isolation, but incoherent next to `inTransaction`,
  which has joined since ADR 0035. The class would keep two nesting semantics;
  the point of this fix is to have one.
- **Savepoints** (`SAVEPOINT` / `ROLLBACK TO` for the nested scope) —
  machinery for partial-rollback semantics nothing needs; join-or-own covers
  every current and foreseeable caller.
- **Rollback-only marking** (a poisoned flag in the ALS scope set when a
  joined scope throws, checked by the owner before COMMIT — Spring's answer
  to the swallowed-inner-failure gap above) — rejected *for now*, not on
  principle: it guards a path reachable only through a call shape the
  codebase doesn't contain, at the cost of mutable cross-scope state in the
  one class whose simplicity the verified COMMIT depends on. Revisit if a
  nested `transaction()` caller ever lands under an error boundary that
  catches and continues.
- **Keep independent nesting, documented** — the failure is silent and only
  surfaces as inconsistent data after an error path; documentation does not
  fix a footgun whose whole hazard is that composition looks correct.

## Consequences

- `UnitOfWork.transaction()` is now idempotent under composition for both
  implementations: `NoOpUnitOfWork` trivially so, `PostgresUnitOfWork` by
  joining. Callers may wrap without knowing whether they are already inside a
  transaction.
- Concurrent `transaction()` calls *inside* an ambient transaction (e.g. a
  `Promise.all` of two wrapped scopes) now share the one client instead of
  running as independent transactions on separate connections. pg serializes
  queries per client, so this is safe — but the scopes are no longer isolated
  from each other, and their fates are joined to the owner's commit. Sibling
  `transaction()` calls *outside* any transaction are unchanged: each async
  context owns its own client and transaction.
- Pinned by the fast `postgres-unit-of-work.spec.ts`: a nested `transaction()`
  acquires no second connection and issues one BEGIN/COMMIT; an outer throw
  discards inner work; `query()` routes to the pool outside a transaction and
  to the transaction's client inside one.
- `rebuild()`'s reset and a hypothetical future caller wrapping it both keep
  the ADR 0036 fencing semantics: joining does not change which transaction
  the CAS conflict aborts.
