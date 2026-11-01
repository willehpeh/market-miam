# 0059. Operator routes live in the api, behind their own Auth0 audience

Date: 2026-11-01 · Status: Accepted

Extends ADR 0018 (an app per audience) to operators, and retires the "future `admin-api`" ADR 0029
anticipated. Builds on ADRs 0021, 0022, 0024 and 0058.

## Context

Operators — the people who run Market Miam — need a console. Their work is the domain's: assign a
subdomain (ADR 0032), erase a vendor (ADR 0058's `EraseVendor` has a handler and no transport),
rebuild a projection, create a vendor's Auth0 account and delete it on erasure.

`admin-api` was a local tool with no sign-in: it listed Auth0 users and read `subdomain_registry`
with raw SQL. Growing it into the console's backend would mean a second composition root for the
event store, a second writer and a second holder of `MASTER_KEY(S)`. And some of the work cannot
live there anyway: `Subscriptions.rebuild()` runs in the api's process, against its live pollers,
and an automatic Auth0 delete on `VendorErased` is a processor, which the api's subscriptions run.

## Decision

**Operator routes live in the api**, under `/api/ops`, in their own module (`OpsModule`).

**They have their own Auth0 audience** (`AUTH0_OPS_AUDIENCE`, `https://api.marketmiam.fr/ops`) and
their own verifier (`OperatorTokenVerifier`), bound apart from the vendor one. A vendor's token
fails the operator verifier on `aud`; an operator's token carries no `vendorId` and fails the
vendor verifier. Neither can be mistaken for the other, whatever a role grants.

**An operator is a token with the `operate` permission** (Auth0 RBAC, the Operator role). A token
that does not verify is a 401; a genuine one without the permission is a 403.

**`OperatorAuthGuard` goes on the controller class, never on single routes.** A spec requests every
route under `ops/` anonymously and expects a 401, so a route that escapes the guard fails CI.

**`admin-frontend` is a static app** at `admin.marketmiam.fr`, signed in through its own Auth0
application with GitHub as its only connection. The token stays in the SDK's memory cache, and its
interceptor attaches it to `/api/ops/*` only. The site sends a CSP that allows its own files, the
api and the Auth0 tenant, and nothing else.

Outside the repo, in Auth0: the Ops API admits user tokens for the admin application only, and no
machine-to-machine client. The post-login Action refuses an admin-app login that is not through
GitHub with the Operator role, and mints no `vendorId` for it.

`admin-api` is retired once its one feature, the list of vendors, moves to `/api/ops`.

## Consequences

- One writer, one key holder; rebuilds and erasure stay in the process that runs the subscriptions.
- The public api host now serves operator routes. Their safety is the audience and the permission,
  checked on every request — hence the class-level guard and the anonymous sweep.
- Operators' second factor is GitHub's 2FA: Auth0's MFA needs a paid plan.
- A reload of the admin app signs in again, the price of keeping the token out of `localStorage`.
- The admin app has no NgRx bridge: one page needs only the `Auth` port and its adapters. ADR 0022's
  facade comes with the first page that shares auth state.

## Rejected

| Option | Why not |
|---|---|
| `admin-api` as the operators' backend | A second event-store composition and key holder; rebuild and processors cannot live there |
| The Operator role on the vendor audience | One verifier for two populations; a misassigned role would make a vendor's token an operator's |
| Auth0 MFA for operators | Paid plan; GitHub's 2FA guards the same account that can already deploy |
