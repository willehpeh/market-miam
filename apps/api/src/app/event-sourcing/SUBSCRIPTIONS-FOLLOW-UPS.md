# Subscriptions follow-ups

Deferred from the 2026-08 complexity review. None are bugs; ranked by value.

## Object design

1. **Polymorphic consumers.** `rebuild()` reaches into `handler.reset()` + `checkpoint.reset()` and gates on `kind`. Replace the `CheckpointedConsumer` union with `ProjectionConsumer` / `ProcessorConsumer` classes owning their own `rebuild(unitOfWork)` (processor variant throws the refusal). Dissolves the union, the `kind` conditional, and the last `as Projection` cast; narrowing happens once, at construction.
2. **`Checkpoints` policy object.** `CHECKPOINT_FACTORY` still has a Symbol token, `@Optional()`, and a silent in-memory default — a Postgres profile that forgets it replays everything on every restart. Apply the `PollSchedule` treatment: required class, `Checkpoints.inMemory()` / `Checkpoints.postgres(...)`.
3. **Split assembly from runtime.** `discovery`, `events`, `lineage`, `checkpointFor` serve only `buildConsumers`; `schedule`, `logger` serve only polling. Extract a consumer-assembly collaborator (still invoked from `onApplicationBootstrap` — Nest lifecycle forces the timing). Halves the constructor.

## Comments

- Consolidate the three "sound via decorator signature" notes (union, `buildConsumers` cast, `handlers()`) into the one on the union type.
- Add the missing warning on `takeUntil(this.stopped)`: it must stay after `mergeMap` — `from(array)` completes synchronously, so moving it up is a silent no-op and leaks every timer past shutdown (pinned by the shutdown test, invisible at the site).
- `ponytail:` tags are opaque — document the convention or replace with plain words.
