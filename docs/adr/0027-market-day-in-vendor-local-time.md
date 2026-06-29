# 0027. Market day is the vendor's local calendar date

Date: 2026-06-29 · Status: Accepted

## Context

ADR 0013 pushed timezone questions "to the edges, where wall-clock dates are
produced" but didn't say which timezone defines "today". Meanwhile the
wall-clock read lived in `LocalDate.today()` — an impurity on a value object —
and `DateClock.today()` merely delegated to it. So the edge that produces the
date and the timezone it uses were both implicit and untested.

## Decision

A market day is the **vendor's local calendar date**. With no per-vendor
timezone data yet, the host's local time is the proxy — acceptable because a
market opening across local midnight is vanishingly rare.

The wall-clock read lives only in the `DateClock` adapter: it formats
`new Date()`'s **local** parts into a `YYYY-MM-DD` `LocalDate`. `LocalDate`
is a pure value object (no static `today()`), symmetric with `Instant`.
`Instant` stays UTC — it is a moment, not a calendar date.

Tests pin the timezone (`America/New_York` in `test/vitest.config.mts`, set in
the parent process so it holds under vitest and Stryker), making the
local-vs-UTC distinction deterministic and falsifiable.

## Consequences

- "Today" has one definition and one production site (the adapter).
- A regression to UTC dates is caught by a failing test, not silent near
  midnight.
- Per-vendor timezones, if ever needed, change only `DateClock` (or its
  injection), not the domain.
