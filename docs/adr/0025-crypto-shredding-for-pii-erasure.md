# 0025. Crypto-shredding for GDPR erasure of PII

Date: 2026-06-10 · Status: Accepted

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
Shredded fields read back as `null`; erasure also rebuilds projections and
deletes the Auth0 user. Full design: `docs/VENDOR_REGISTRATION_AND_PII.md`.

## Consequences

- Erasure is one key deletion plus a projection rebuild — no event
  rewriting, and read models purge for free via replay.
- Adopted now, while zero production events exist; retrofitting encryption
  onto live streams would be far costlier.
- Shredded streams must stay loadable. PII is kept out of aggregate `apply`
  wherever possible, so a shredded stream rehydrates untouched; where PII
  absolutely must be rebuilt in `apply` (or a projection), that logic must
  accept shredded streams — tolerating `null` PII fields rather than failing.
  This is a narrow, deliberate exception to ADR 0007's re-validate-and-fail-
  loudly rule, limited to shreddable fields; non-PII rehydration still
  re-validates and fails loudly.
- Subject resolution is vendorId-from-metadata for now; per-field subject
  mapping is a known extension point if customer PII ever lands in vendor
  streams.
