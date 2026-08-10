# 0045. Domain errors reach HTTP through one shared filter list

Date: 2026-08-10 · Status: Accepted

Records a decision in force since the API's first controllers, referenced by
ADRs 0031 and 0033 before it had a number, and extended during menu du jour
slice 4 (`f8511e0`).

## Context

Value objects and aggregates throw named `DomainError` subclasses (ADR 0007);
the domain packages are framework-free, so nothing below the controllers may
know what an HTTP status is. The transport needs a policy for errors crossing
that boundary — and had two gaps: per-controller mapping would be repeated and
would drift, and `ConcurrencyError` (a lost append, ADR 0028) surfaced as a
500, making every double-submit read as an incident to anything counting
error rate.

A third gap was operational, found in slice 4: filters registered in the
production module alone are invisible to tests, and vice versa. A filter added
to only the test harness passed the whole suite while production still
answered 500 — nothing boots `AppModule` in a test, so nothing would notice.

## Decision

- **`DomainErrorFilter`**, a global Nest exception filter, catches every
  `DomainError` and answers 400 with
  `{ statusCode, message: "<ErrorName> - <message>" }`. The domain throws by
  name; the edge translates. Nothing else in the API maps domain errors.
- **`ConcurrencyErrorFilter`** answers a lost append with 409: a race the
  caller resolves by retrying, not a server fault. Stream positions stay out
  of the response — the client cannot act on them, and the span already
  carries them for diagnosis.
- **`global-filters.ts` is the single registration list**, consumed by
  `AppModule` and every test harness alike, so a filter cannot exist in one
  world and not the other.

## Consequences

- Domain packages never import HTTP; a new domain error is mapped correctly
  the moment it extends `DomainError`, with no edge change.
- One error dialect for clients: `statusCode` + `"Name - message"`. The
  request-shape gate (ADR 0046) deliberately mirrors it.
- Error class names travel to clients in the message. Accepted: the only
  consumers are our own frontends, and the names are the diagnosis.
- 409 vs 400 splits "retry it" from "fix it" for the frontends' error
  handling.
- Test/production filter parity is structural, not disciplinary — the shared
  list is the fix for the slice-4 near-miss, and adding a filter anywhere
  else should fail review.
