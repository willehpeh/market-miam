# 0008. No getters or setters — behavior-exposing methods only

Date: 2026-05-02 · Status: Accepted

## Context

Conventional TypeScript style exposes object state through get/set accessors,
which invites callers to pull data out and make decisions externally —
anemic-domain territory. The codebase follows the object-thinking style
(Bugayenko): objects are asked to do things, not to reveal themselves.

## Decision

Domain objects expose no getters or setters. State is private and readonly;
objects offer behavior methods (`changePrice()`, `conflictsWith()`,
`registerMarketSchedule()`) and, where data must cross a boundary, explicit
serialization methods — `value()` on simple values, `snapshot()` on
composites. Mutation happens only by applying events.

## Consequences

- Logic stays next to the data it concerns; "tell, don't ask" is the default
  calling convention.
- Serialization is a deliberate, named act (`value()`/`snapshot()`), so it's
  obvious where state crosses boundaries — these feed event payloads.
- Tests must assert through behavior and emitted events rather than peeking
  at fields, which reinforces ADR 0006.
- Occasionally more verbose than property access; accepted as the cost of
  encapsulation.
