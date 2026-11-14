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
`delete:users`). The Action's code is not in the repo yet: slice 4 changed it in Auth0, and it comes
in once the owner pastes it, deployed from then on from the owner's machine with the Auth0 CLI.

## Slices

**0. Walking skeleton — live since 2026-11-01** at `admin.marketmiam.fr`, checked by signing in
with GitHub on the deployed site. `GET /api/ops/whoami` returned the operator's Auth0 id behind
`OperatorAuthGuard`, and the admin app signed in through GitHub and showed it; slice 4 retired the
route, the account list answering the same question. A static Render service with a strict CSP
serves the app. Specs: the operator verifier against real RS256 tokens (audience,
issuer, expiry, subject, the `operate` permission), the guard's 401/403, the route, and a sweep that
requests every `ops/` route anonymously.

**1. Account list — built.** Moves `admin-api`'s one feature. `GET /api/ops/accounts` lists every
Auth0 account with its `vendorId` and the subdomain its vendor holds, ordered by email; the admin
app shows it at sign-in, each storefront linked, and says so if the api refuses the sign-in.
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

**4. Invite a vendor — built 2026-11-14, ahead of slice 3** (the owner's call, 2026-11-02; ADR 0060).
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
  the account (`openFor`, answering `open`, `email-in-use` or `email-refused`). Its Auth0 adapter
  creates the user on the `email` connection with the `vendorId` in `app_metadata` (`create:users`,
  and the connection enabled for the Management application), beside `Auth0Accounts` and sharing
  its token, and asks Auth0 to send the vendor no email. A refusal it cannot act on names Auth0's
  status and error code, never its message. Auth0 keeps emails unique, and checks them more
  strictly than `Email`: on `email-in-use`, an invitation that lost a race for its address, or
  `email-refused`, an address Auth0 finds malformed, the processor sends `EraseVendor` for it. A
  vendor erased in the meantime is skipped. Any other failure retries, and `/api/health` reports it.
- **Admin app** (ADR 0061). An email field and an *Invite* button above the account list, disabled
  while it sends, made for a phone first. The page is the smart component, over three facades on
  NgRx: the sign-in, the accounts and the invitations. The invitation facade sends the address and
  reports sending, the address it went to, or why it did not go: the address is in use (409),
  refused (400), or the invitation was not sent. A sent invitation joins the list at once, marked
  *invited* under the `vendorId` the api minted, until the next load brings the account the
  processor opened. The page loads the list at each sign-in; a 401 or 403 there says the api
  refused the sign-in, and nothing else is offered. `GET /api/ops/whoami` is retired, its one use
  covered. The form and the list are dumb.
- **Specs.** The aggregate's states (ADR 0060's table); the route's 202, 409 and metadata, with the
  anonymous sweep covering its guard; the processor against `InMemoryVendorAccounts`; the
  `VendorAccounts` contract, run against the in-memory adapter and the Auth0 adapter, which also
  runs against the fake Auth0 server as `Auth0Accounts` does; `VendorInvited`'s email encrypted at
  rest; the page through a page object against fake facades, rendering the form and the list; the
  accounts and invitation features from facade to `HttpTestingController`, together for the
  invited row; the sign-in from facade to a fake `Auth`.

Progress. By 2026-11-13: the domain, the `VendorAccounts` port with its contract, and
`OpensVendorAccounts`. `Auth0VendorAccounts` runs the contract against FakeAuth0, and by hand
against a test tenant (`npx nx test:tenant api`). The api wires them per profile:
`Auth0AccountsModule` outside development, one Management API client shared by both Auth0 adapters,
and `DevelopmentAccountsModule` in memory. Then the route. 2026-11-14: the admin app on ADR 0061's
layering, whoami retired, and the spec pinning `VendorInvited`'s email encrypted at rest.

Going live, in this order, by the owner:

1. Give the Management application `create:users`, enable the `email` connection for it, then
   deploy. *`create:users` given 2026-11-13; the slice deployed 2026-11-14, and its first
   invitation stalled on Auth0's 400 until the connection is enabled: the processor retries it
   every 30 seconds at most, and `/api/health` answers 503 meanwhile.*
2. In the account list, find vendor accounts with no `vendorId`: made by hand and never signed in.
   Delete each in Auth0 and invite it again from the admin app.
3. Change the post-login Action to stop minting `vendorId`s and to refuse a vendor-app login
   without one. *Done in Auth0 by the owner. Its code is still to come into the repo: the owner
   pastes it.*
4. Turn on *Disable Sign Ups* on the `email` connection.

**5. Erase a vendor.** A transport for `EraseVendor`, and a processor on `VendorErased` that
deletes the Auth0 user (`delete:users`), whether the vendor registered or was only invited. It
finds the user by `vendorId`, never by email: an invitation erased for a taken address (slice 4)
shares that address with another vendor's account.

**6. Rebuild a projection.** A transport for `Subscriptions.rebuild()`.

Every write records the operator's Auth0 id in the metadata of what it appends, and asks for
confirmation where it cannot be undone.
