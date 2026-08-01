# 0039. Shredding reads degrade to the sentinel; writes stay strict

Date: 2026-08-01 · Status: Accepted

## Context

The M3 finding: two fail-loud paths in `ShreddingEventStore` were loud about
the wrong things.

1. **Encrypt side** — the PII field filter admitted any value that wasn't
   `undefined`, and the type check then rejected anything that wasn't a
   string. A payload with `{ phone: null }` — legal for an optional PII
   field — failed the whole append.
2. **Decrypt side** — on seeing an `enc:v1:` value, `decrypt` resolved the
   subject via `subjectOf`, which throws when `metadata.vendorId` is absent.
   Any stored PII event missing subject metadata made `load()` and
   `loadFrom()` throw **permanently**: the log is append-only, so one
   malformed event was an unrepairable poison pill for its stream and for
   every subscription's catch-up path.

The codebase already had the graceful pattern: a shredded key degrades to the
`SHREDDED` sentinel so reads keep working. These paths chose loud failure
where the same reasoning applies.

## Decision

**Writes stay strict; reads become total.**

1. The encrypt filter admits only non-nullish values (`!= null`):
   `null`/`undefined` mean "nothing to encrypt" and pass through untouched,
   while any other non-string PII value still fails the append loudly. The
   subtlety that shaped this: narrowing the filter to
   `typeof value === 'string'` (the finding's literal suggestion) would have
   made the type guard *unreachable* — a numeric PII value would silently
   skip encryption and be stored in plaintext, trading a loud failure for a
   silent leak.
2. Read-path key resolution is total. A private `readKeyFor(event)` collapses
   metadata → subject → key into one query: an unresolvable subject yields a
   `null` key, which flows into the **existing** `key === null → SHREDDED`
   branch. No new branch, no new sentinel; "no subject" is modelled as the
   fact it implies — no key is recoverable. The write path is untouched:
   `subjectOf` still throws in `encrypt`, so an event can never be *stored*
   without a subject; the read path merely refuses to let a historical
   violation become a permanent outage.

Rejected:

- **A distinct `UNRECOVERABLE` sentinel** — the missing-subject/shredded
  distinction belongs in logs and spans, not the data channel; one sentinel
  preserves the invariant that PII fields read back as strings and that
  erased data is indistinguishable from data that never existed.
- **A shared nullable `resolveSubject(): string | null` helper** — ask-y:
  two call sites each inspecting a nullable and applying their own policy.
  The subject is a lookup intermediate and now escapes neither path.
- **A polymorphic key object** (`RecoveredKey`/`ShreddedKey` with a
  `reveal()` each) — the null-object pattern pays when it deletes distributed
  branching; the shredded-key branch occurs exactly once and cannot be
  removed even then, since a *present* subject's key can still be null. It
  would also push a presentation concern (the sentinel) into the key
  abstraction and churn the `DataKeys` port just before the M2 keyring work
  restructures it.
- **Pushing decryption into `DataKeys`** — maximal tell-don't-ask, but it
  conflates key lifecycle (the port's job) with crypto application (the
  decorator's job) and forces both adapters to carry GCM code.
  `Buffer | null` is the port's deliberate, domain-meaningful contract:
  null *is* the message "this subject's data is gone".

## Consequences

- A malformed historical event degrades to `SHREDDED` and is, at the data
  level, indistinguishable from a legitimately shredded one. Accepted: the
  distinction is operational, and this class has no logger; revisit (e.g. a
  span attribute in the tracing decorator) if it ever matters in practice.
- Appending `{ field: null }` stores null untouched and round-trips as null;
  non-string, non-null PII values still reject the append.
- Pinned by `shredding.event-store.spec.ts`: null pass-through at rest and on
  load, `SHREDDED` for an event stripped of subject metadata, and the
  catch-up path (`loadFrom`) reading past such an event while decrypting its
  healthy neighbours.
