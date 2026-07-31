# M1 — The in-memory adapter can violate global ordering Postgres cannot

| | |
|---|---|
| Severity | Medium |
| Area | Test infrastructure fidelity |
| Files | `packages/event-sourcing/src/adapters/in-memory/in-memory.event-store.ts:47-76` |
| Status | Open |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

`InMemoryEventStore` keeps seeded and appended events in two arrays and defines
`allEvents()` as `[...seededEvents, ...appendedEvents]`, while
`toStoredEvents` assigns `globalPosition` from `allEvents().length + index + 1`
at insertion time. Calling `seedWith` **after** `append` therefore produces an
event whose `globalPosition` is higher than the appended events' but whose array
position is *earlier* — and:

- `loadFrom` filters and slices **without sorting**, returning events out of
  global-position order;
- `head()` returns the *last array element's* position rather than the maximum,
  so it can report a value lower than positions `loadFrom` already returned.

Postgres can exhibit neither behaviour — `ORDER BY global_position` and
`MAX(global_position)` make both impossible.

## Failure scenario

The whole premise of the contract-test strategy ("one suite, run against both
adapters, so the fake and the real thing cannot drift") assumes the fake is at
least as strict as the real store. Here the fake is *looser*: a test that seeds
after appending — an easy arrangement in a multi-step spec — can see
out-of-order delivery or a wrong lag computation (`Subscriptions` computes lag
as `head() - checkpoint.read()`, `subscriptions.ts:130-133`) and either pass
when Postgres would fail or fail mysteriously when Postgres would pass. A
fidelity bug in the fake silently weakens every spec that runs on the in-memory
profile — which is the entire `apps/api` suite.

## Evidence

Static: the two-array split, position assignment, unsorted `loadFrom`, and
last-element `head()` are all visible in
`in-memory.event-store.ts:47-76`. Mutation-side corroboration from the
evaluation's Stryker run: **5 of the file's 7 surviving mutants sit on the
`seedWith` stream-filter line** (`in-memory.event-store.ts:37` — mutants such as
`e.streamId !== streamId` and `() => undefined` survive), confirming this is the
loosest-pinned area of the adapter.

## Suggested fix

Either of:

1. Maintain a **single monotonic counter** for `globalPosition` and a single
   ordered array — seeding appends to the same log the way a real store would;
   or
2. Keep the split but **sort by `globalPosition`** in `allEvents()` (and derive
   `head()` from the max, not the last element).

Option 1 is simpler and removes the class of bug rather than patching two
symptoms.

Regression tests to pin it, in `eventsContract` so both adapters must satisfy
them: (a) interleaved seed/append still yields `loadFrom` in strictly ascending
`globalPosition`; (b) `head()` ≥ every position ever returned by `loadFrom`.
(If `seedWith` is intentionally a test-only affordance that must never follow
`append`, the honest alternative is to make that ordering throw — but then the
constraint is enforced, not assumed.)
