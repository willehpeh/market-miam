# Admin app — plan

The operator console: `admin-frontend`, a static app at `admin.marketmiam.fr`, over operator routes
in `api` under `/api/ops` (ADR 0059). It replaced `admin-api`, a local tool with no sign-in, retired
on 2026-11-01, and it is the ops surface `NEXT_BEHAVIOURS.md` waited on for erasure, rebuilds and the Auth0 delete.

## Auth0, outside the repo

Set up 2026-10-31 and 2026-11-01 on the `willalexander.eu.auth0.com` tenant:

- **Market Miam Ops**, an API with identifier `https://api.marketmiam.fr/ops`: RBAC on, permissions
  in the access token, one permission, `operate`. User-delegated access per app (Market Miam Admin
  only); no client access.
- **Operator**, a role holding `operate`, given to the owner's GitHub user.
- **Market Miam Admin**, a single-page application: GitHub its only connection; callback, logout
  and web-origin URLs `https://admin.marketmiam.fr` and `http://localhost:4300`.
- **GitHub**, a social connection with its own GitHub OAuth app, enabled on the admin app only.
- **The post-login Action**: an admin-app login must come through GitHub with the Operator role, or
  it is refused, and it gets no `vendorId`; vendor claims are minted for the vendor app only.

Still to check: the Ops API's token lifetime (an hour or less), *Implicit* off on the admin app,
*Disable Sign Ups* on the `email` connection, the *API Explorer* and test applications deleted, and
the *Management* application down to `read:users` (slice 4 adds `create:users`, slice 5
`delete:users`). The Action's code is not in the repo yet; it comes in with slice 4, which changes
it, deployed from the owner's machine with the Auth0 CLI.

## Slices

**0. Walking skeleton — live since 2026-11-01** at `admin.marketmiam.fr`, checked by signing in
with GitHub on the deployed site. `GET /api/ops/whoami` returns the operator's Auth0 id behind
`OperatorAuthGuard`; the admin app signs in through GitHub and shows it; a static Render service
with a strict CSP serves it. Specs: the operator verifier against real RS256 tokens (audience,
issuer, expiry, subject, the `operate` permission), the guard's 401/403, the route, and a sweep that
requests every `ops/` route anonymously.

**1. Account list — built.** Moves `admin-api`'s one feature. `GET /api/ops/accounts` lists every
Auth0 account with its `vendorId` and the subdomain its vendor holds, ordered by email; the admin
app shows it under the operator, each storefront linked, once the api has confirmed the operator.
The Management API client (`Auth0Accounts`, `read:users` only) keeps its token until a minute
before expiry and shares it between lists started together, since Auth0 meters those tokens; it is
specced against a fake Auth0 on a local port. Subdomains come through
`SubdomainRegistry.assignments()`, specced in memory and on Postgres, instead of raw SQL. Going live
needs the Management app's `AUTH0_MGMT_CLIENT_ID` and `AUTH0_MGMT_CLIENT_SECRET` on Render first:
the api will not start without them.

**2. Retire `admin-api` — done 2026-11-01.** The app is deleted, with its debug configuration,
its `tools/test-all.mjs` entry and its layer in the test map. The README and `MARKET_MIAM.md` no
longer list it, `EVENT-SOURCING-ARCHITECTURE.md` §10.5 loses its first gap (wrong besides: the app
never wrote anything), and ADR 0029 is amended. Left to the owner: delete the local
`apps/admin-api/.env`, which held the Management secret and the production database's address, and
narrow the database's external access on Render (no `ipAllowList` in `render.yaml` today), keeping
whatever psql access the owner still wants.

**3. Assign a subdomain.** Ends the hand-written SQL every new vendor waits on (ADR 0032). A
`register` on the port, with `admin`, `api`, `app` and `www` reserved.

**4. Invite a vendor — in progress, ahead of slice 3** (the owner's call, 2026-11-02; ADR 0060).
Ends creating vendors by hand in the Auth0 Dashboard, and makes Market Miam invitation-only.

- **Domain** (`packages/market-days`). `InviteVendor` raises `VendorInvited { vendorId, invitedAt,
  email }`, first on the vendor's stream, its `email` added to `vendor-pii-fields.ts`. `Vendor`
  gains an *invited* state: inviting again is a no-op, `register` works from it as from a new
  stream, and `erase` accepts it. The vendor app's registration on first load stays: it is the
  vendor taking up the invitation.
- **Route.** `POST /api/ops/vendors { email }` lower-cases the address, as Auth0 keeps it, looks it
  up (`read:users`) and refuses it with a 409 if any account holds it, the owner's GitHub address
  included: a plus alias of it serves for trying the vendor app. It then mints the `vendorId`, sends
  `InviteVendor` and answers 202 with the id. The operator's Auth0 id reaches the event's metadata
  on the request's lineage: `OperatorLineageInterceptor`, on the ops controller beside its guard,
  extends it on every operator route, so later operator writes carry it without asking.
- **Processor.** `OpensVendorAccounts`, on `VendorInvited`, asks the `VendorAccounts` port to open
  the account (`openFor`, answering `open` or `email-in-use`). Its Auth0 adapter creates the user on
  the `email` connection with the `vendorId` in `app_metadata` (`create:users`), beside
  `Auth0Accounts` and sharing its token. Auth0 keeps emails unique: on `email-in-use`, an invitation
  that lost a race for its address, the processor sends `EraseVendor` for it. A vendor erased in
  the meantime is skipped. Any other failure retries, and `/api/health` reports it.
- **Admin app.** An email field and an *Invite* button above the account list, disabled while it
  sends. The new account shows in the list once the processor has run, a few seconds later.
- **Specs.** The aggregate's states (ADR 0060's table); the route's 202, 409 and metadata, with the
  anonymous sweep covering its guard; the processor against `InMemoryVendorAccounts`; the
  `VendorAccounts` contract, run against the in-memory adapter and the Auth0 adapter, which also
  runs against the fake Auth0 server as `Auth0Accounts` does; the form.

Progress, 2026-11-13. Built: `InviteVendor` and the *invited* state, erasure of an invited vendor,
the `VendorAccounts` port with its contract, and `OpensVendorAccounts`, which opens the account,
erases an invitation whose address is taken, and skips a vendor erased in the meantime.
`Auth0VendorAccounts` opens accounts on the `email` connection and turns Auth0's 409 into
`email-in-use`; it runs the contract against FakeAuth0, and by hand against a test tenant (`npx nx
test:tenant api`). The api wires them per profile: `Auth0AccountsModule` outside development, one
Management API client shared by both Auth0 adapters, and `DevelopmentAccountsModule` in memory. The
route is built. The Management application has `create:users` (step 1 below). Left: the form. Two
specs will pass at once and belong on the way: registering an invited vendor, and `VendorInvited`'s
email encrypted at rest.

Going live, in this order, by the owner:

1. Give the Management application `create:users`, then deploy.
2. In the account list, find vendor accounts with no `vendorId`: made by hand and never signed in.
   Delete each in Auth0 and invite it again from the admin app.
3. Change the post-login Action to stop minting `vendorId`s and to refuse a vendor-app login
   without one. Its code comes into the repo with this slice; the owner pastes the current version
   first.
4. Turn on *Disable Sign Ups* on the `email` connection.

**5. Erase a vendor.** A transport for `EraseVendor`, and a processor on `VendorErased` that
deletes the Auth0 user (`delete:users`), whether the vendor registered or was only invited. It
finds the user by `vendorId`, never by email: an invitation erased for a taken address (slice 4)
shares that address with another vendor's account.

**6. Rebuild a projection.** A transport for `Subscriptions.rebuild()`.

Every write records the operator's Auth0 id in the metadata of what it appends, and asks for
confirmation where it cannot be undone.
