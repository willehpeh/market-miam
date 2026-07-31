# Event Store Findings

Findings from the 2026-07-31 quality evaluation of the event store
(`packages/event-sourcing` + its composition in `apps/api`), at commit `eec797b`.
One document per finding: the issue, the failure scenario, the evidence, and the
suggested fix. Statuses are tracked in each document; nothing here is fixed by
merely being written down.

Evidence basis: static review with file:line references throughout; the fast test
suites executed during the evaluation (`test` project 407/407, `api` project
112/112, all green); a Stryker mutation run scoped to `packages/event-sourcing`
(50.00% total score, 89.95% covered score, 19 survivors, 151 no-coverage); and a
runnable repro for W1. The testcontainers suite could **not** be executed in the
evaluation environment (no Docker) — claims about container specs are from
reading them, not running them.

## Findings, most severe first

| ID | Severity | Finding | Primary files |
|---|---|---|---|
| [W1](w1-silent-append-failure.md) | **Critical** | A failed INSERT yields a successful `append()` | `append-transaction.ts` |
| [W2](w2-appends-bypass-unit-of-work.md) | High | Appends bypass the ambient UnitOfWork; processor exactly-once broken | `postgres.event-store.ts` |
| [W3](w3-checkpoint-monotonicity-and-ownership.md) | High | Checkpoints accept backwards writes and have no owner | `postgres.checkpoint.ts` |
| [T1](t1-test-and-ci-blind-spots.md) | High | Poison-event rollback untested; Postgres adapters outside the mutation net; CI not on PRs | `stryker.conf.mjs`, `ci.yml` |
| [W4](w4-nested-transaction-footgun.md) | Med-High | Nested `transaction()` silently opens a second, independent transaction | `postgres.unit-of-work.ts` |
| [M2](m2-master-key-rotation-impossible.md) | Medium | The master key can never be rotated | `postgres.data-keys.ts` |
| [M1](m1-in-memory-ordering-infidelity.md) | Medium | The in-memory adapter can violate global ordering Postgres cannot | `in-memory.event-store.ts` |
| [M3](m3-shredding-hard-throws-on-legal-input.md) | Medium | Shredding hard-throws on legal inputs; one path bricks a stream | `shredding.event-store.ts` |
| [M4](m4-aad-omits-stream-position.md) | Low-Med | AAD binds identity but not position; ciphertexts swappable within a stream | `shredding.event-store.ts` |
| [M7](m7-listen-boot-and-stop-issues.md) | Low | LISTEN boot resolves on failure; `stop()` never completes its subjects | `postgres.notifications.ts` |
| [M5](m5-read-path-write-amplification.md) | Low (tradeoff) | Read-path write amplification: one transaction per event per consumer | `polling.subscription.ts` |
| [M6](m6-write-path-scaling-ceilings.md) | Low (tradeoff) | Write-path scaling ceilings: global lock, O(n) check, unbounded load | `append-transaction.ts` |

The W/M/T taxonomy is the evaluation's: **W** = write/read-path correctness,
**M** = medium-and-below implementation issues, **T** = test-and-tooling. Within
a letter the numbers are identity, not rank — severity is what orders the table.
