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
stream. The email is PII, encrypted under the vendor's key and shredded with it (ADR 0025), and
kept in lower case, as Auth0 keeps it. The operator's Auth0 id goes in the event's metadata: it
rides on the request's lineage, which an interceptor beside the operator guard extends on every
operator route, so each later operator write carries it too.

**The api mints the `vendorId`** when it records the invitation, as a random UUID. The operator
never chooses one, so an invitation cannot land on an existing vendor's id. The id's nature is
ADR 0024's: pseudonymous, kept in `app_metadata`, stamped on every vendor token.

**A processor opens the account.** On `VendorInvited` it asks the `VendorAccounts` port to open
one for the invitation: on the `email` connection, with the `vendorId` in `app_metadata`. The port
answers in the domain's terms:

- `open`: this vendor's account is open, just now or already. A retry finds the one it opened.
- `email-in-use`: the address already holds an account that is not this vendor's, another vendor's
  or one made by hand. The invitation can never produce an account, so the processor sends
  `EraseVendor` for it, and its email dies with its key.
- `email-refused`: Auth0 refuses the address itself, checking addresses more strictly than the
  domain's `Email`. That invitation can never produce an account either, so it is erased too. Only
  Auth0's payload validation failing on the email property counts: any other refusal throws.
- The vendor was erased in the meantime: skipped.
- Anything else (network, Auth0 down, rate limit) throws, and the subscription retries.

**Auth0 keeps emails unique.** One account per email is the identity provider's rule, not the
domain's: a token carries one `vendorId`, so a login maps to one vendor. The domain cannot say what
"the same vendor" is when it invites one: the email is a login and a contact, and the business's
identity, its SIRET, comes later with the legal identity. The route looks the email up before it
records anything and refuses it if any account holds it, so only two invitations of one address, in
the seconds before the first account opens, reach `email-in-use`. Vendors sign in only on the
passwordless `email` connection and operators only through GitHub, so neither the lookup nor the
adapter filters by connection. The one cost: an operator's own GitHub address cannot be invited,
and a plus alias of it serves for trying the vendor app.

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
  Deleting their Auth0 user is the same processor as for any erased vendor, and it finds the user
  by `vendorId`, never by email: an invitation erased for a taken address shares that address with
  another vendor's account.
- A stray invitation leaves `VendorInvited` then `VendorErased` on its stream, with the same
  correlation id, and nothing else.
- The rule holds in two places: the event records each invitation, and the Action enforces it.
  The aggregate cannot: vendors from before registered without one, so `RegisterVendor` still
  accepts a new stream.
- The account appears in Auth0 a few seconds after the invitation. If Auth0 is down, the processor
  retries, and `GET /api/health` turns 503 after five failures in a row.
- The Management application gains `create:users`, and the `email` connection is enabled for it:
  Auth0 creates a user only on a connection enabled for the client asking, and answers 400
  otherwise. The first live invitation, on 2026-11-14, found that out.
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
| A reservation table of invited emails | Holds the email outside the encrypted events and needs a transaction commands do not run in, to prevent a second account Auth0 already refuses |
| A blind index: a keyed hash of the email on the event | Still personal data after erasure, since whoever holds the key can recompute it, and the log cannot drop it |
| A platform stream holding every invitation | Checking one email would decrypt every vendor's |
| Logging a stray invitation, or an event of its own | A log line fades and leaves the email behind; a new event would have no reader. Erasure uses events that exist |
| Invitation tokens that expire | The passwordless account already is the invitation; a token adds state for nothing |
