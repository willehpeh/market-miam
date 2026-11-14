# 0064. Api specs call the api through an api object

Date: 2026-11-14 · Status: Accepted

Extends ADR 0062 (smart-component specs drive a page object) to the api's specs. Builds on
ADR 0006.

## Context

The api's specs call routes through supertest, each file with helpers of its own: `invite`,
`invited`, `erase` and `invitations` in the operator API's spec, `authed` and `erase` in the
erasure spec. Every helper repeats the token header and the path, and some exist only to dig what
the next step needs out of a response body: `invited` pulled the minted `vendorId` from the 202.
The helpers share the spec's scope: on 2026-11-14 a test's local `invited` shadowed the helper,
and both typecheck and the test failed. The anonymous sweep's route discovery sat at the top of
the file as a free function.

ADR 0062 settled the same problem in the frontends with page objects. The api's caller is a
client, not a person reading labels, but the shape fits.

## Decision

**An api spec calls the api through an api object**: a plain class in
`apps/api/src/app/testing/`, named for the api it calls, such as `OperatorApi`.

- **It names the routes its caller uses**, a method each: `accounts()`, `invite(email)`,
  `erase(vendorId)`. Each returns supertest's request, so the spec asserts the status and the body
  itself: `await ops.invite('owner@acme.test').expect(409)`.
- **It signs every call with its caller's token, given once**: `new OperatorApi(app)` is the
  operator, `new OperatorApi(app, NOT_AN_OPERATOR_TOKEN)` someone signed in who is not one, and
  `new OperatorApi(app, null)` no one at all.
- **A step a spec builds on returns what the next step needs.** `inviteVendor(email)` returns the
  invited vendor. It fails where the api refuses, as a page object's asynchronous action settles,
  and checks nothing else: what a spec is about, the spec asserts, as ADR 0062 has it.
- **What was recorded is read through objects of its own**: `VendorOnRecord`, a vendor's stream
  by their id, and `EventLog`, the events of a type across the log. The api object never hands out
  the app, the event store or a fake. The spec arranges through the app what the api cannot reach,
  such as a subdomain in the registry.
- **It owns the list of its routes**, read from the controllers Nest registered, so the sweep that
  calls each one anonymously covers a route added tomorrow.

Specs move as they are next touched, as ADR 0062's did. Moved with this record: the operator API's
spec. Not yet: the erasure spec's `authed` and `erase`, and the vendor routes' specs, which will
call a `VendorApi` signed with a vendor's token.

## Consequences

- A route's path, or how its caller signs in, changes in one method.
- Specs read as the caller's steps, and a vendor is a handle that carries its id rather than a
  string pulled out of a body.
- The operator API's spec keeps no function of its own: its four helpers and its route discovery
  became `OperatorApi`, `VendorOnRecord` and `EventLog`.
- An api object grows with its api: assigning subdomains (admin plan slice 3) and rebuilding
  projections (slice 6) add methods to `OperatorApi`.

## Rejected

| Option | Why not |
|---|---|
| Helpers per file, as before | They repeat headers and paths, share the spec's scope, and grow with no shape |
| One authorised-request helper, such as the erasure spec's `authed(app, verb, path)` | It names no route: the path is written out in every test |
| Assertion methods on the api object, such as `expectRefused()` | A failure no longer says what was checked (ADR 0062) |
| Reading the log through the api object | Mixes what the caller can do with what the spec checks: no caller of the api reads the log |
