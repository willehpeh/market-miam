# 0021. Delegate authentication to Auth0

Date: 2026-06-08 · Status: Accepted

## Context

Vendors need accounts and sign-in. Building credential storage, password
reset, and session security in-house is high-risk undertow for a small team;
delegating to an identity provider trades money and a dependency for that
risk.

## Decision

Use Auth0 as the identity provider. The vendor frontend integrates via
`@auth0/auth0-angular` (redirect flow); the API will verify Auth0-signed
JWTs (RS256, checked against tenant JWKS with `iss`/`aud`/`exp`). Vendors
are manually provisioned in Auth0 for now. Custom logic (vendorId minting,
ADR 0024) lives in Auth0 Actions.

## Consequences

- No credential storage or password flows to build or defend.
- Token verification is a pure adapter concern; the domain sees a `VendorId`
  value object and never knows JWTs exist.
- The frontend must request an `audience` so Auth0 issues a JWT rather than
  an opaque token.
- Auth0 is a paid external dependency and holds the user's email/password —
  account erasure must include deleting the Auth0 user (see ADR 0025).
