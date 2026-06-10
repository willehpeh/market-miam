# 0006. Outside-in TDD with fakes at boundaries

Date: 2026-05-02 · Status: Accepted

## Context

Tests can be written class-by-class with mocks, or outside-in against
use-case behavior with real collaborators. Mock-heavy tests couple to
implementation structure and break under refactoring; the domain here is
expected to be refactored aggressively as the language evolves.

## Decision

Drive development outside-in: tests exercise a whole use case (command →
aggregate → events → projection → read model) using real domain objects.
Only infrastructure ports are substituted, with hand-written in-memory fakes
(`InMemoryEventStore`, `InMemoryCheckpoint`, `InMemorySubscription`, …) — no
mocking frameworks. Tests, fakes, and test-data builders live in a shared
`test` package rather than inside the packages under test.

## Consequences

- Internal structure can be refactored freely; only behavior changes break
  tests.
- Fakes are real implementations of the ports, so they double as executable
  specifications for production adapters.
- Test code can't be used to justify speculative surface area — assertions go
  through use-case behavior, not extra accessors.
- Coverage doubles as a TDD audit: uncovered code is code written without a
  driving test.
