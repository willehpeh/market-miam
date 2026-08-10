# 0046. Request shape gated by zod at the transport edge

Date: 2026-08-10 · Status: Accepted

## Context

Value objects validate values (ADR 0007) — but only values that arrive.
Controllers typed their bodies as plain literals (`body: { itemIds: string[] }`)
with nothing enforcing the annotation, so a body missing a key or carrying the
wrong primitive died deep inside a value object — `undefined.map`, a number
hitting `.trim()` — and surfaced as a 500. Every write route had the hole; the
photo-signature route was worse, answering garbage with a confidently wrong
200. Seventeen garbage-body specs written against the routes were red as 500s.

The idiomatic Nest fix, class-validator with decorated DTO classes, was
rejected: this API deliberately has no DTO classes. Hand-rolled guards fix one
route cleanly but grow inconsistent by the third. zod schemas are plain values
matching the plain-literal style, and `z.infer` derives the static type from
the schema — the annotation and the check become one artifact.

## Decision

- **`shapeOf(schema)`** (`apps/api/src/app/shape-of.pipe.ts`) is a hand-rolled
  pipe — no `nestjs-zod` dependency — applied per body:
  `@Body(shapeOf(MenuBody)) body: z.infer<typeof MenuBody>`. Schemas live
  beside their controllers, where the type literals they replaced sat.
- **Shape only, by contract.** A schema answers "is this JSON the shape the
  handler reads?" — presence, primitive types, arrays. Formats, ranges and
  existence stay with the value objects (`startDate` is `z.string()`, never a
  date regex — `LocalDate` owns that rule and its error). A schema must never
  repeat a rule a `DomainError` already owns; one rule, one home.
- **Wrong shape answers 400** in `DomainErrorFilter`'s body format (ADR 0045),
  named `InvalidRequestShape` and listing the offending paths. One error
  dialect, two layers: shape at the edge, meaning behind it — a request can
  pass the first and still earn the second's 400.
- **Unknown fields are stripped, not rejected** (zod's default), so an older
  client sending more than we read stays served across deploys.
- **The schemas stay in the API.** Neither frontend imports them: both keep
  their own DTO copies by design (menu du jour slice 6), and a shared schema
  package would recouple what was consciously decoupled.

## Consequences

- Malformed input is a 400 naming the field instead of a logged incident;
  `request-shape.spec.ts` pins one garbage body per hole plus the
  tolerance case (extra fields pass).
- Body annotations are now derived from the check (`z.infer`), so type and
  validation cannot drift.
- The shape/meaning line is discipline the compiler cannot enforce: a schema
  that grows `.regex()` or `.min()` duplicates a domain rule and will drift
  from it. Review guards this line.
- One runtime dependency (`zod`), API-only.
- Builds on ADR 0007 (value construction is still the real guard), 0011
  (validation's standard home is the handler/controller layer), and 0045
  (the error dialect it mirrors).
