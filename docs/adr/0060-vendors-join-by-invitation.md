# 0060. Vendors join by invitation, and the api mints their vendorId

Date: 2026-11-02 · Status: Accepted

Amends ADR 0024 (vendor identity) and ADR 0058 (erasure). Builds on ADRs 0025 and 0059.

## Context

No vendor signs themselves up. The owner creates each one by hand in the Auth0 Dashboard, on the
passwordless `email` connection. The post-login Action mints the `vendorId` at the vendor's first
sign-in (ADR 0024), and the vendor app's first load records `VendorRegistered`.

Until that first sign-in, the vendor exists only in Auth0:

- **No id.** Nothing can be prepared for them, a subdomain included.
- **No record.** The event store does not know they were let in, or by whom. Auth0's logs name
  whoever called its Management API, and keep for a day on Starter, five on Essentials.
- **Out of erasure's reach.** `EraseVendor` refuses a vendor who never registered (ADR 0058).
- **The rule is unenforced.** The Action mints an id for any login to the vendor app, so while
  sign-ups are open on the `email` connection, anyone who types an address gets an account and a
  `vendorId`.

## Decision

**Market Miam is invitation-only.** An operator invites a vendor from the admin app, and the
invitation is an event: `VendorInvited { vendorId, invitedAt, email }`, first on the vendor's
stream. The email is PII, encrypted under the vendor's key and shredded with it (ADR 0025). The
operator's Auth0 id goes in the event's metadata.

**The api mints the `vendorId`** when it records the invitation, as a random UUID. The operator
never chooses one, so an invitation cannot land on an existing vendor's id. The id's nature is
ADR 0024's: pseudonymous, kept in `app_metadata`, stamped on every vendor token.

**A processor opens the account.** On `VendorInvited` it creates the Auth0 user on the `email`
connection, with the `vendorId` in `app_metadata`. Every step is safe to repeat:

- A user with that email and this `vendorId` already exists: done, it is a retry.
- A user with that email and another id exists: the invitation lost a race for its address. The
  processor logs it and stops; the stray invitation is erased like any vendor.
- The vendor was erased in the meantime: skipped.
- Anything else (network, Auth0 down, rate limit) throws, and the subscription retries.

The route refuses an email already on an Auth0 account before it records anything, so the race is
the only way the second case arises.

**The Action stops minting.** It copies `app_metadata.vendorId` into the token and refuses a
vendor-app login without one. Only an invitation makes one.

**`VendorRegistered` keeps ADR 0024's meaning:** the vendor's first sign-in to the vendor app,
with the email Auth0 verified. It is the vendor taking up the invitation. `OpensStorefronts` stays
on it, so a storefront still opens at first sign-in.

| `Vendor` state | `InviteVendor` | `RegisterVendor` | `EraseVendor` |
|---|---|---|---|
| new | raises `VendorInvited` | raises `VendorRegistered` | `VendorNotRegisteredError` |
| invited | no-op | raises `VendorRegistered` | raises `VendorErased` |
| registered | no-op | no-op | raises `VendorErased` |
| erased | `VendorErasedError` | `VendorErasedError` | no-op |

**An invitation is the account itself.** There is no token, no expiry and nothing to resend:
whoever holds that inbox can sign in at `app.marketmiam.fr`. Withdrawing an invitation is erasing
the vendor. The system sends nothing; the operator tells the vendor.

## Consequences

- The `vendorId` exists from the invitation, so a subdomain can be assigned before the first
  sign-in.
- Every vendor invited from now on has a stream, so erasure reaches one who never signed in.
  Deleting their Auth0 user is the same processor as for any erased vendor.
- The rule holds in two places: the event records each invitation, and the Action enforces it.
  The aggregate cannot: vendors from before registered without one, so `RegisterVendor` still
  accepts a new stream.
- The account appears in Auth0 a few seconds after the invitation. If Auth0 is down, the processor
  retries, and `GET /api/health` turns 503 after five failures in a row.
- The Management application gains `create:users`.
- The invited email is the address the operator typed; `VendorRegistered`'s is the one Auth0
  verified. On a passwordless connection they are the same inbox.
- Vendor and person stay one-to-one, as ADR 0024 assumed. `VendorInvited` brings a new business
  onto the platform. Inviting a teammate to an existing vendor would be another event, and who
  sent it would be payload rather than metadata.
- An invitation email from the system would be a second processor on `VendorInvited`, and a line
  in the vendor privacy policy, which names only the sign-in emails today.

## Rejected

| Option | Why not |
|---|---|
| No event; the Auth0 account is the record | No lasting trace of who let a vendor in; a vendor who never signs in has no stream for erasure to reach |
| Create the Auth0 user in the request, then append | Two writes with nothing keeping them in step; a crash between them leaves an account with no record |
| Raise `VendorRegistered` at invitation, with the typed email | Changes what past events mean: ADR 0024's email is the one Auth0 verified at first sign-in |
| The admin app mints the `vendorId` | The operator would choose ids, and an existing vendor's would have to be guarded against |
| A dead-letter queue for the processor | Dead-lettering skips, and a skipped invitation is lost (`docs/archive/DEFERRED.md`); the route refuses the foreseeable failure up front |
| Invitation tokens that expire | The passwordless account already is the invitation; a token adds state for nothing |
