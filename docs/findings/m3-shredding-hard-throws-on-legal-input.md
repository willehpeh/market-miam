# M3 — Shredding hard-throws on legal inputs; one path bricks a stream

| | |
|---|---|
| Severity | Medium |
| Area | Crypto-shredding |
| Files | `packages/event-sourcing/src/adapters/shredding.event-store.ts:47,55-57` (encrypt side), `:74,82-88` (decrypt side) |
| Status | **Fixed** ([ADR 0039](../adr/0039-shredding-reads-degrade-writes-stay-strict.md)) |
| Found | 2026-07-31 evaluation @ `eec797b` |

## Issue

Two fail-loud choices in `ShreddingEventStore` are loud about the wrong things:

1. **Encrypt side — a `null` PII field rejects the whole append.** The field
   filter admits any value that isn't `undefined`; the type check then rejects
   anything that isn't a `string`. A payload with `{ phone: null }` — perfectly
   legal for an optional PII field — makes `append()` throw
   `PII field "phone" … must be a string to encrypt`.
2. **Decrypt side — a PII event missing subject metadata bricks its stream.**
   On seeing an `enc:v1:` value, `decrypt` calls `subjectOf(event.metadata)`,
   which throws if `metadata.vendorId` is absent or empty. Any historical event
   written before the metadata contract stabilised, or by a path that didn't
   stamp `vendorId`, makes `load()` and `loadFrom()` throw **permanently** —
   the log is append-only, so there is no repair path. One malformed event is a
   poison pill for its stream (and, via `loadFrom`, stalls every subscription
   that reaches it).

The codebase already demonstrates the graceful pattern: a shredded key degrades
to the `SHREDDED` sentinel rather than throwing, precisely so reads keep
working. These two paths chose loud failure where the same degradation
reasoning applies.

## Failure scenario

- (1) A new optional PII field is added to an event; a client sends `null`;
  registration/edit requests 500 for an input the domain considers valid.
- (2) Worse: a bug ships that appends one PII-bearing event without `vendorId`
  metadata. From that moment, the vendor's stream cannot be rehydrated (their
  commands all fail) and the catch-up path throws every poll — forever, since
  the event can be neither fixed nor deleted. Detection is immediate but the
  blast radius is permanent.

## Evidence

Static: the filter and type-check on the encrypt side, and
`subjectOf`'s throw on the decrypt side, are all visible in
`shredding.event-store.ts` at the cited lines. The in-memory spec suite pins
the *current* throwing behaviour for non-string values and missing metadata on
**append** (`shredding.event-store.spec.ts:93-104`) — reasonable as a write-time
guard — but nothing covers the decrypt-side poison-pill consequence for
already-stored events.

## Suggested fix

1. **Encrypt side**: narrow the filter to `typeof value === 'string'`. Genuinely
   wrong types (numbers, objects) keep failing loudly at append time —
   the write-time guard stays — while `null`/`undefined` mean "nothing to
   encrypt" and pass through untouched.
2. **Decrypt side**: keep append-time strictness (an event *written* without a
   subject is a bug worth failing on — that guard already exists at `:74`), but
   on **read**, degrade a missing subject the way a shredded key degrades:
   replace the field with the `SHREDDED` sentinel (or a distinct
   `UNRECOVERABLE` sentinel if the distinction matters operationally) and
   continue. The stream stays readable; the defect stays observable via the
   sentinel and a warning log/span attribute rather than via an outage.

Regression tests to pin it: append with `{ field: null }` succeeds and stores
null untouched; a hand-stored event with `enc:v1:` payload and no `vendorId`
metadata loads with the sentinel instead of throwing, and a subscription polls
past it.

## Update (2026-08-01)

Fixed ([ADR 0039](../adr/0039-shredding-reads-degrade-writes-stay-strict.md)),
with one deviation from this finding's suggested fix 1: the encrypt filter was
narrowed to non-nullish (`!= null`), **not** to `typeof value === 'string'` —
the latter would have made the write-time type guard unreachable, silently
storing a numeric PII value in plaintext instead of rejecting it. As written
here, null/undefined pass through untouched and every other non-string still
fails the append loudly.

On the decrypt side, a private `readKeyFor(event)` makes read-path key
resolution total: an unresolvable subject yields a `null` key and flows into
the existing `key === null → SHREDDED` branch — no new sentinel (the
`UNRECOVERABLE` option was rejected; the distinction belongs in logs/spans,
not the data channel). Write-path strictness is unchanged: `subjectOf` still
throws in `encrypt`. Pinned in `shredding.event-store.spec.ts`: null
pass-through at rest and on load, `SHREDDED` for an event stripped of subject
metadata, and `loadFrom` reading past such an event while decrypting healthy
neighbours.
