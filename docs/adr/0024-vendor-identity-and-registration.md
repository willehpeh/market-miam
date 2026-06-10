# 0024. Vendor identity: minted UUID, idempotent registration, no PII in events

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
`VendorRegistered` already exists. The event payload is minimal —
`{ vendorId, registeredAt }` — never copying email or other token claims
into the event store. Profile PII enters only via explicit commands
(`UpdateVendorProfile`), whose events carry the complete resulting profile,
not field diffs.

## Consequences

- Identity-provider migrations and future teammates-per-vendor changes stay
  inside the Auth0 Action; streams never notice.
- Unconditional register + idempotent handler avoids the check-then-act
  race with no extra round trip.
- The event store stays PII-free by default; what PII does enter is
  confined to known profile events, enabling ADR 0025.
- Full-state profile events keep projections diff-free and replay trivial.
