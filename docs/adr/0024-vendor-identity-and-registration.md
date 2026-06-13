# 0024. Vendor identity: minted UUID, idempotent registration, registered-with email

Date: 2026-06-10 · Status: Accepted

## Context

Event streams are keyed by vendorId (ADR 0009) and events are immutable, so
the choice of identifier is permanent. Using the Auth0 `sub` directly was
rejected: it bakes a 1:1 user↔vendor assumption into streams, couples
stream IDs to the identity provider (`sub` changes on connection
migration), and leaks `auth0|...` formatting into events, logs, and URLs.

## Decision

vendorId is a random UUID minted lazily in an Auth0 post-login Action,
persisted to `app_metadata`, and stamped on every access token as a custom
claim. It is pseudonymous — not PII — and lives in plaintext everywhere. On
first sign-in the frontend unconditionally calls `POST
/vendor/registrations`; the idempotent `RegisterVendor` handler no-ops if
`VendorRegistered` already exists. The HTTP adapter reads the verified
`email` claim from the token alongside the `vendorId` custom claim, and the
event payload is `{ vendorId, email, registeredAt }`. The email is a
deliberate *registered-with snapshot* — captured once at first sign-in to
identify the vendor administratively and pre-populate their profile — not
their current, editable address. Because registration is an idempotent
no-op, this email is never updated by re-registration; the *current* email
is future profile work. It is PII, so it is encrypted at rest via the
crypto-shredding registry (ADR 0025), not the pseudonymous `vendorId`. No
other token claims are copied. Subsequent profile PII enters only via
explicit commands (`UpdateVendorProfile`), whose events carry the complete
resulting profile, not field diffs.

This reverses the original decision to keep `VendorRegistered` PII-free.
That stance kept the registration path purely about identity, but forced
vendors to re-enter an email Auth0 already holds and gave operators no
in-system handle on who a stream belongs to. Capturing the email once, as
shreddable PII, is the better trade now that ADR 0025 makes erasure cheap.

## Consequences

- Identity-provider migrations and future teammates-per-vendor changes stay
  inside the Auth0 Action; streams never notice.
- Unconditional register + idempotent handler avoids the check-then-act
  race with no extra round trip.
- The only PII in the registration event is the registered-with email,
  encrypted at rest and shreddable via ADR 0025; the rest of the event store
  stays PII-free by default, with further PII confined to known profile
  events.
- Because the email is encrypted at rest, operators cannot read it via raw
  SQL — administrative "who's who" must go through a decrypted surface (a
  read model or the decrypting load path), deferred for now.
- The registration email is frozen at first sign-in; correcting or updating
  it is `UpdateVendorProfile` work, and the profile read model will fold both
  the registration email and later profile edits.
- Full-state profile events keep projections diff-free and replay trivial.
