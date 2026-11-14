# 0064. Specs reach the api through objects

Date: 2026-11-14 · Status: Accepted · Widened the same day to the frontends' feature specs, which
answer for the api through a fake api object

Extends ADR 0062 (smart-component specs drive a page object) to the api's specs, and to the
frontends' feature specs of ADR 0061. Builds on ADR 0006.

## Context

The api's specs call routes through supertest, each file with helpers of its own: `invite`,
`invited`, `erase` and `invitations` in the operator API's spec, `authed` and `erase` in the
erasure spec. Every helper repeats the token header and the path, and some exist only to dig what
the next step needs out of a response body: `invited` pulled the minted `vendorId` from the 202.
The helpers share the spec's scope: on 2026-11-14 a test's local `invited` shadowed the helper,
and both typecheck and the test failed. The anonymous sweep's route discovery sat at the top of
the file as a free function.

The frontends' feature specs meet the same api from the other side, through
`HttpTestingController`, and had the same helpers: each file matched its routes with URL
predicates of its own, `ACCOUNTS` and `VENDORS`, and `ERASURE_OF` was written into two specs the
day it appeared. Every answer was spelled out as a flush with a status and its text,
`{ status: 202, statusText: 'Accepted' }`, nine times in two files.

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

**A frontend feature spec answers for the api through a fake api object**: a plain class over
`HttpTestingController`, in the app's `core/http/`, named for the api it stands in for, such as
the admin app's `FakeOperatorApi`.

- **It names the routes the feature calls**, a method each: `accounts()`, `invitation()`,
  `erasureOf(vendorId)`. Each expects that request, so a route the feature never called fails
  there, as `expectOne` does, and returns it to be answered.
- **The request is answered in the api's terms**: `answer(body)` for a 200, `accept()` for a 202,
  `refuse(status)` for a refusal such as a 401, `fail()` for a 500. The statuses and their texts
  live there, each added when a spec first needs it. The spec reads what it checks off the
  request, such as its `method`.
- **It verifies that nothing else was sent**, `verify()`, so a spec needs no
  `HttpTestingController` of its own.
- **Each app keeps its own**, as with `PageObject`: the apps share no code, with each other or
  with the api, so the fake and the api's `OperatorApi` name the same routes twice, on purpose.

Specs move as they are next touched, as ADR 0062's did. Moved with this record: the operator API's
spec in the api; the admin app's erasure and account feature specs. Not yet: the erasure spec's
`authed` and `erase`, and the vendor routes' specs, which will call a `VendorApi` signed with a
vendor's token; the admin app's invitation and sign-in specs; the vendor app's feature specs.

## Consequences

- A route's path, or how its caller signs in, changes in one method.
- Specs read as the caller's steps, and a vendor is a handle that carries its id rather than a
  string pulled out of a body.
- The operator API's spec keeps no function of its own: its four helpers and its route discovery
  became `OperatorApi`, `VendorOnRecord` and `EventLog`. More code in total, as with ADR 0062: the
  spec went from 181 lines to 128, and the three objects add 100. The admin app's two feature
  specs barely shrink, from 219 lines to 215, with the fake adding 64: each answer still takes its
  line, but says `accept()` where it said `flush(null, { status: 202, statusText: 'Accepted' })`,
  and no spec matches a URL.
- An api object grows with its api: assigning subdomains (admin plan slice 3) and rebuilding
  projections (slice 6) add methods to `OperatorApi`, and to the admin app's `FakeOperatorApi`.
- A changed route is changed in three places, by design: the controller, the api object and the
  fake. Each side's specs fail until it follows.

## Rejected

| Option | Why not |
|---|---|
| Helpers per file, as before | They repeat headers and paths, share the spec's scope, and grow with no shape |
| One authorised-request helper, such as the erasure spec's `authed(app, verb, path)` | It names no route: the path is written out in every test |
| Assertion methods on the api object, such as `expectRefused()` | A failure no longer says what was checked (ADR 0062) |
| Reading the log through the api object | Mixes what the caller can do with what the spec checks: no caller of the api reads the log |
| Shared constants for the routes' paths | Names a path, not a route or its answers; the statuses stay spelled out in every spec |
| A fake backend such as Mock Service Worker | A new dependency, beside an `HttpTestingController` the specs already use |
