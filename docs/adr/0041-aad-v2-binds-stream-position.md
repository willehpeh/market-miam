# 0041. enc:v2 — the AAD binds the event's stream position

Date: 2026-08-01 · Status: Accepted

## Context

The M4 finding: the GCM AAD sealed each PII ciphertext to stream, type, and
field — so a ciphertext moved to another vendor, another event type, or
another field failed authentication — but not to *which occurrence*. Two
same-type events in one stream produced interchangeable ciphertexts for the
same field: an actor (or a buggy migration script) with trigger-bypassing
write access could swap a vendor's current encrypted phone number for a prior
one, and replay, projections, and every spec would accept it silently. That
is precisely the tampering class AAD exists to make detectable.

Corroborating evidence from the evaluation's mutation run: mutating the AAD
template to an empty string survived the whole suite — nothing pinned that
the AAD existed at all. (The same blindness nearly bit operationally: the
AAD's separators were invisible literal NUL bytes until the M4 doc
correction, and an accidental change to them would have bricked every
ciphertext while staying green.)

## Decision

**Version the value envelope's AAD; new writes bind position.**

1. `encrypt` always writes `enc:v2:`, whose AAD is
   (streamId, eventType, field, streamPosition) with each component
   **length-prefixed** (4-byte big-endian length + UTF-8 bytes) — closing the
   theoretical separator-ambiguity for free while the format changes anyway.
   A ciphertext moved to *any* other event — same stream or not — now fails
   authentication loudly. This is deliberate fail-loud, not an M3 degrade
   case: a failed tag is evidence of tampering, and the alarm is the point.
2. `decrypt` dispatches on the envelope prefix: `enc:v1:` values use the old
   3-part NUL-separated AAD verbatim, forever — the log is append-only, so v1
   values never rewrite and their AAD can never change. `enc:v2:` uses the
   new AAD. This mirrors ADR 0040 on the value side: a version discriminator
   selects the unwrap path; writes always use the current version.
3. The position is bound at encrypt time, before the row exists:
   event *i* of a batch lands at `expectedStreamPosition + i + 1`, already
   known from the append signature. If the optimistic-concurrency check later
   rejects the append, nothing persists, so the binding cannot go stale. On
   decrypt the position comes off the stored row.

Rejected:

- **Re-sealing existing v1 values under v2** — impossible without violating
  the append-only log; v1 handling is permanent but frozen, and the v1
  population only shrinks relative to new writes.
- **Binding the event `id` instead of the position** — equally unique, but
  the id is minted inside the inner store *after* encryption runs; the
  position is the value the append flow already knows. (The id would also
  bind nothing the position doesn't.)
- **Keeping the NUL-separator format for v2** — length-prefixing costs
  nothing at a format break and removes the component-content caveat
  entirely, rather than arguing it's theoretical.

## Consequences

- Within-stream ciphertext swaps — the one undetectable relocation — now
  fail authentication. The residual limits are honest and unchanged: AAD
  authenticates a field *in place*; deleting events or restoring a whole
  stale stream are different attacks, owned by the append-only trigger and
  backups respectively.
- A tampered event makes its stream throw on load. That is an alarm, not a
  poison pill in the M3 sense — but operationally it reads the same until
  investigated; the distinction is that here the throw carries signal.
- Pinned by `shredding.event-store.spec.ts`: a same-type same-stream swap
  throws; a same-position cross-stream move throws (same subject on both
  streams, isolating the streamId binding from the per-vendor key); a
  hand-sealed `enc:v1` value still decrypts. The swap specs kill the
  evaluation's two surviving AAD mutants and pin the template against
  invisible edits.
- The at-rest prefix assertions in `vendor-pii-fields.spec.ts` and the
  shredding spec now expect `enc:v2:`.
