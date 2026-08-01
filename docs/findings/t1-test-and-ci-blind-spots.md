# T1 — Test and CI blind spots: the quality tooling watches the safest code

| | |
|---|---|
| Severity | High |
| Area | Tests, CI, mutation testing |
| Files | `stryker.conf.mjs:7-9`, `.github/workflows/ci.yml:3-6`, `packages/event-sourcing/src/adapters/polling.subscription.ts:24-28`, `test/vitest.config.mts` |
| Status | Partially fixed — see [Progress](#progress) |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

The test estate is genuinely strong — all eight contract suites run against both
adapters, the parallel-append race and handle+checkpoint atomicity are proven
against real Postgres, LISTEN reconnect is covered through
`pg_terminate_backend`. But its blind spots cluster exactly where the riskiest
code lives:

1. **Poison-event rollback is untested on the handler side.** The comment at
   `polling.subscription.ts:24-28` promises that a throwing handler rolls back
   both the projection write and the checkpoint write. The only failure
   injection anywhere is on the **checkpoint** side
   (`transactional-projection.container.spec.ts:32-39`). No test in the repo
   makes a *handler* throw mid-transaction.
2. **The Postgres adapters sit outside the mutation net by construction.**
   `stryker.conf.mjs:7-9` points the runner at `test/vitest.config.mts` — the
   fast suite only. Container specs (and all of `apps/api`'s specs) cannot kill
   mutants. Measured in the evaluation's Stryker run: `adapters/postgres`
   scored **0.69%**, with **144 of 145 mutants no-coverage**. This is the code
   where [W1](w1-silent-append-failure.md) lives.
3. **CI runs only on push to `main`** (`ci.yml:3-6` — no `pull_request`
   trigger). Every red build is discovered after merge. Additionally
   `--base=${{ github.event.before }}` is fragile (all-zeros SHA on force-push
   or first push, silently changing what "affected" means).
4. **Mutation testing never runs in CI** (the target exists at
   `test/project.json:33-38`; no workflow invokes it) and `stryker.conf.mjs`
   sets **no thresholds**, so the score is advisory and can decay silently.
5. Smaller gaps in the same spirit: `checkpointContract` is two tests (no
   per-name isolation, no `write(0)`); batching past `BATCH_SIZE = 100` is never
   exercised against Postgres; `ShreddingEventStore` never runs
   `eventStoreContract` nor composes over the real Postgres pair;
   `ApplicationEventStore` (the full Tracing∘Lineage∘Shredding chain) is only
   DI-identity-checked; `PostgresUnitOfWork` has no direct spec
   ([W4](w4-nested-transaction-footgun.md)); backoff cap, `resetOnSuccess`,
   `exhaustMap` overlap-suppression, and shutdown are unasserted; the fast
   suite's coverage config lacks `all: true`, so wholly-untested package files
   are invisible rather than reported at 0%.

## Evidence (executed during the evaluation)

Fast suites: `test` 407/407, `api` 112/112, green. Stryker on
`packages/event-sourcing` (331 mutants, 86s): **50.00% total, 89.95% covered
score** — the tests that run kill mutants well; half the package's mutants are
never reached. Three survivors are diagnostic rather than noise:

- `polling.subscription.ts:36` — the `while (batch.length === BATCH_SIZE)`
  continuation mutated to `false` **survives**: batch-loop draining is unpinned
  inside the mutation net (the 250-event drain test lives in `apps/api`, outside
  Stryker's runner).
- `shredding.event-store.ts:92` (×2) — the AAD string mutated to empty
  **survives**: no test detects the AAD exists
  ([M4](m4-aad-omits-stream-position.md)).
- `in-memory.event-store.ts:37` (×5) — the `seedWith` stream-filter line, the
  loosest-pinned area of the fake ([M1](m1-in-memory-ordering-infidelity.md)).

## Suggested fix

In value order:

1. **Add the `pull_request` trigger to CI** — config-only, the cheapest
   high-value fix in the entire evaluation. Use `nx affected` with a merge-base
   (e.g. `--base=origin/main`) rather than `github.event.before`.
2. **Handler-failure injection spec**: mirror
   `transactional-projection.container.spec.ts`'s `FailingCheckpoint` with a
   `FailingHandler` — handler throws after its view write; assert the view write
   rolled back *and* the checkpoint did not advance, then exactly-once on
   retry. This pins the claim at `polling.subscription.ts:24-28` and pairs
   naturally with the fixes for [W2](w2-appends-bypass-unit-of-work.md).
3. **Batch-boundary case in `subscriptionContract`**: >100 events through
   `poll()` — kills the surviving loop mutant for both adapters and covers the
   `loadFrom` limit boundary against Postgres.
4. **Stryker thresholds** (`thresholds: { high: 80, low: 60, break: 60 }` or
   similar) and a CI job for `nx run test:mutation` — even nightly rather than
   per-PR. Making container specs a mutation runner is expensive; the pragmatic
   move is accepting the fast-suite scope but *knowing* the boundary, which the
   per-directory score table now documents.
5. Fold the smaller gaps into the contracts as their subjects get touched:
   checkpoint isolation + `write(0)` with [W3](w3-checkpoint-monotonicity-and-ownership.md),
   the UoW spec with [W4](w4-nested-transaction-footgun.md), a shredding-over-
   Postgres composition spec with [M2](m2-master-key-rotation-impossible.md)/[M4](m4-aad-omits-stream-position.md).

## Progress

- **Issue 3 fixed** by [#21](https://github.com/willehpeh/market-miam/pull/21):
  CI runs the full pipeline (including `test:container`) on every PR. The
  fragile `github.event.before` base is also gone for PRs — a PR compares
  against its base branch's sha — though pushes to `main` still use it
  (suggested fix 1's merge-base refinement remains open for that path).
- **First INSERT-stage failure injection** landed with the W1 fix
  ([#22](https://github.com/willehpeh/market-miam/pull/22)): a container spec
  drives a mid-batch jsonb rejection through `append()` and asserts
  nothing persisted. Handler-side poison-event injection (issue 1) is still
  missing.
- **Dropped promises now fail lint**
  ([#23](https://github.com/willehpeh/market-miam/pull/23)):
  `@typescript-eslint/no-floating-promises` workspace-wide, type-aware — the
  static half of the net that would have flagged W1 outright. Six existing
  violations were fixed with it, including a missing `await` in
  `subscriptions.spec.ts` that only passed by stub timing.
- **The UoW slice of gap 5 closed across the W2 and W4 fixes**: the direct
  `postgres-unit-of-work.spec.ts` landed with W2
  ([ADR 0035](../adr/0035-appends-join-the-ambient-unit-of-work.md)) — commit,
  rollback-and-rethrow, the verified-COMMIT tag check, both `inTransaction`
  placements — and the W4 fix
  ([ADR 0037](../adr/0037-nested-transactions-join-the-ambient-unit-of-work.md))
  added nested-`transaction()` join semantics, outer-throw-discards-inner-work,
  and `query()` routing.
- **The checkpoint slice of gap 5 closed with the W3 fix**
  ([ADR 0036](../adr/0036-checkpoint-advances-are-compare-and-set.md)):
  `checkpointContract` grew from two tests to eight — per-name isolation,
  stale-advance rejection (including from a pre-reset position, the W3 fence),
  and `reset()` semantics — run against both adapters, plus a container spec
  proving a stale writer's view write rolls back with its rejected advance.

Still open: issues 1 (handler-failure injection), 2 (Postgres adapters outside
the mutation net), 4 (no Stryker thresholds or CI mutation job), and the
remaining smaller gaps in 5.
