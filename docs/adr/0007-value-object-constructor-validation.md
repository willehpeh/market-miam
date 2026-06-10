# 0007. Value objects validated in constructors

Date: 2026-05-02 · Status: Accepted

## Context

Domain values (prices, names, dates, schedules) need invariants enforced
somewhere: in command handlers, in a separate validation layer, or in the
values themselves. Validation was briefly moved out of value objects and then
deliberately moved back ("Go back to validating in value objects", May 16).

## Decision

Value objects validate in their constructors and throw a domain-specific
error (`InvalidPriceError`, `InvalidScheduleError`, …) — an instance that
exists is valid. Composite values rebuilt from persisted event payloads use a
`fromSnapshot()` factory paired with a `snapshot()` method, so rehydration
goes through the same validating constructors.

## Consequences

- Invalid state is unrepresentable; handlers and aggregates never re-check
  inputs.
- Failures surface at the edge, as named domain errors the transport layer
  can map.
- Rehydration re-validates history: a snapshot that no longer satisfies
  current invariants fails loudly at load rather than silently corrupting
  state.
- Constructors throwing means callers construct values up front, not deep
  inside domain logic.
