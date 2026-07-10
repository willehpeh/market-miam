# 0025. Crypto-shredding for GDPR erasure of PII

Date: 2026-06-10 · Status: Accepted · Amended 2026-07-07 — shredded-read representation changed from `null` to the `SHREDDED` sentinel

## Context

Vendor profiles hold real PII (name, email, address, phone — vendors are
often sole traders), and GDPR erasure must coexist with an immutable event
log. Rejected alternatives: deleting the stream (breaks once PII leaks into
cross-vendor streams) and storing PII outside events in a mutable store
(profile stops being event-sourced; events stop being self-describing).

## Decision

Encrypt registered PII fields in event payloads with a per-vendor data key
held outside the event store; erase by deleting the key
(`DataKeys.shred(vendorId)`), leaving the log intact but those fields
permanently unreadable. Implemented as a decorator (`ShreddingEventStore`)
around the `EventStore`/`Events` ports, driven by a declarative per-event
PII field registry — the domain never learns encryption exists. AES-256-GCM
via Node's built-in `crypto` (orchestration is built in-house; primitives
are not), with envelope-encrypted keys (env master key now, KMS later).
Shredded fields read back as the `SHREDDED` sentinel (`'<shredded>'`, not
`null` — keeps read-model columns `NOT NULL` and value objects off the null
path); erasure also rebuilds projections and deletes the Auth0 user. Full
design: `docs/archive/VENDOR_REGISTRATION_AND_PII.md`.

## Consequences

- Erasure is one key deletion plus a projection rebuild — no event
  rewriting, and read models purge for free via replay.
- Adopted now, while zero production events exist; retrofitting encryption
  onto live streams would be far costlier.
- Shredded streams must stay loadable. PII is kept out of aggregate `apply`
  (verified: `Vendor.apply`/`Storefront.apply` reconstruct no PII value
  objects — the profile lives only in the read model as raw strings), so a
  shredded stream rehydrates untouched and no value object ever sees the
  sentinel. Making string VOs *accept* `SHREDDED` was rejected — it weakens
  every PII VO's invariant for a path that doesn't occur, and strict VOs like
  `Email` reject the sentinel anyway. If a VO ever must be built from a
  shreddable field, handle the sentinel at that site.
- Subject resolution is vendorId-from-metadata for now; per-field subject
  mapping is a known extension point if customer PII ever lands in vendor
  streams.
