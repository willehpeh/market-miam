# 0038. The in-memory store keeps one log; "appended" is a view, not storage

Date: 2026-08-01 · Status: Accepted

## Context

The M1 finding: `InMemoryEventStore` kept seeded and appended events in two
arrays, defined `allEvents()` as seeded-then-appended concatenation, and
assigned `globalPosition` from the combined length at insertion time. Calling
`seedWith` **after** `append` therefore produced an event whose position was
higher than the appended events' but whose array index was earlier — so
`loadFrom` (which filters and slices without sorting) returned events out of
global-position order, and `head()` (which read the *last array element's*
position) could report a value lower than positions `loadFrom` had already
returned. Postgres can exhibit neither behaviour; the fake was *looser* than
the real store, which inverts the premise of the contract-test strategy.

The two-array split was not accidental. `newEvents()` and `lastEvent()` are
the Given/Then assertion mechanism for seventeen command specs — "given seeded
history, when the command runs, assert only the *new* events." Any fix had to
preserve that affordance. The split's real mistake was conflating two
concerns: ordering/position assignment (storage) and "which events did the
code under test produce" (a view).

## Decision

**One log, one insertion path.** A single `log` array is the sole source of
ordering: a private `store()` method assigns `streamPosition` and
`globalPosition` from the log's state and pushes, and both `append` and
`seedWith` delegate to it (`append` adds the concurrency check and the poke).
`appended` survives as an array of *references* into the log, serving
`newEvents()`/`lastEvent()` only — no position is ever derived from it.

This removes the bug class by construction: insertion order equals
global-position order, so `loadFrom` needs no sort and `head()` reading the
last element is *correct* rather than an approximation of the max. Seeding is
now structurally "append minus the concurrency check and the poke", which is
exactly what a seeded fixture claims to be.

Rejected:

- **Sort in `allEvents()` and derive `head()` from the max** — patches the two
  observed symptoms while keeping two sources of truth; the next derived
  quantity added to the class would face the same trap.
- **Throw when `seedWith` follows `append`** — enforces a constraint nothing
  needs; interleaving seed and append is a legitimate arrangement in a
  multi-step spec, and the store can simply be correct under it.
- **Pin the interleaving invariants in the shared `eventsContract`** (as the
  finding suggested) — `seedWith` is not on any port; Postgres has no seeding
  affordance to interleave, so the contract case would be vacuous or
  contorted there. The invariants are pinned in an in-memory-specific spec
  instead.

## Consequences

- Ordering fidelity is structural, not asserted: there is no arrangement of
  `seedWith`/`append` calls under which array order and position order
  diverge, so the fake can no longer pass a spec Postgres would fail (or vice
  versa) on ordering grounds.
- `newEvents()`/`lastEvent()` semantics are unchanged; no command spec was
  touched.
- Pinned by `in-memory-event-store.seeding.spec.ts`: ascending `loadFrom`
  order and max-based `head()` under seed-after-append, one shared position
  sequence, per-stream `streamPosition` continuity across interleaving, and
  `newEvents()` scoping.
- The M1 Stryker survivors on the `seedWith` stream-filter line lose their
  home — the filter now lives in one `streamOf()` helper exercised by both
  write paths.
