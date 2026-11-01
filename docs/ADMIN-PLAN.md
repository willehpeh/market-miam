# Admin app — plan

The operator console: `admin-frontend`, a static app at `admin.marketmiam.fr`, over operator routes
in `api` under `/api/ops` (ADR 0059). It replaces `admin-api`, a local tool with no sign-in, and it
is the ops surface `NEXT_BEHAVIOURS.md` waited on for erasure, rebuilds and the Auth0 delete.

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
the *Management* application down to `read:users`. The Action's code is not in the repo yet; it
belongs there, deployed from the owner's machine with the Auth0 CLI.

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

**2. Retire `admin-api`.** Delete the app and its `tools/test-all.mjs` entry; correct the README,
`MARKET_MIAM.md`, `EVENT-SOURCING-ARCHITECTURE.md` §10.5 (gap 1 is wrong about what it writes) and
ADR 0029's mention. The owner deletes the local `apps/admin-api/.env`, which holds the Management
secret and the production database's address, and narrows the database's external access on Render
(no `ipAllowList` in `render.yaml` today).

**3. Assign a subdomain.** Ends the hand-written SQL every new vendor waits on (ADR 0032). A
`register` on the port, with `admin`, `api`, `app` and `www` reserved.

**4. Create a vendor.** A user on the passwordless `email` connection, created through the
Management API (`create:users`) with its `vendorId` minted into `app_metadata`, so the subdomain
can be assigned at once. The Action can then refuse a vendor login without a `vendorId` instead of
minting one, which amends ADR 0024.

**5. Erase a vendor.** A transport for `EraseVendor`, and a processor on `VendorErased` that
deletes the Auth0 user (`delete:users`).

**6. Rebuild a projection.** A transport for `Subscriptions.rebuild()`.

Every write records the operator's Auth0 id in the metadata of what it appends, and asks for
confirmation where it cannot be undone.
