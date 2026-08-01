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

- An inner failure aborts the *shared* transaction — the semantics the name
  promises. There is no partial rollback; savepoints can come later if a
  caller ever legitimately needs one (none does).
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
- **Keep independent nesting, documented** — the failure is silent and only
  surfaces as inconsistent data after an error path; documentation does not
  fix a footgun whose whole hazard is that composition looks correct.

## Consequences

- `UnitOfWork.transaction()` is now idempotent under composition for both
  implementations: `NoOpUnitOfWork` trivially so, `PostgresUnitOfWork` by
  joining. Callers may wrap without knowing whether they are already inside a
  transaction.
- Pinned by the fast `postgres-unit-of-work.spec.ts`: a nested `transaction()`
  acquires no second connection and issues one BEGIN/COMMIT; an outer throw
  discards inner work; `query()` routes to the pool outside a transaction and
  to the transaction's client inside one.
- `rebuild()`'s reset and a hypothetical future caller wrapping it both keep
  the ADR 0036 fencing semantics: joining does not change which transaction
  the CAS conflict aborts.
