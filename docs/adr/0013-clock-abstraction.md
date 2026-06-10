# 0013. Clock abstraction for time-dependent domain logic

Date: 2026-05-23 · Status: Accepted

## Context

Rules like "items cannot be planned for a market day in the past" depend on
the current date. Reading the system clock inside domain logic makes such
rules untestable without date trickery and hides a real dependency.

## Decision

Define a `Clock` interface (`today(): LocalDate`) in `common` and inject it
where current-date decisions are made (e.g. the `MarketDays` repository
passes `clock.today()` into `MarketDay`). Dates themselves are `LocalDate`
value objects — calendar dates as `YYYY-MM-DD` strings, with no time-of-day
or timezone component.

## Consequences

- Temporal rules are tested deterministically by injecting a fixed clock.
- "Now" enters the domain in exactly one way, visible in constructor
  signatures.
- LocalDate's string comparison (`isBefore`) is safe because the format is
  validated; timezone questions are pushed to the edges, where wall-clock
  dates are produced.
