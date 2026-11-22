# auth

Token verification, framework-agnostic, for the two kinds of people who sign in.

- **Vendors** — a `TokenVerifier` port with three adapters — `Auth0TokenVerifier`
  (verifies Auth0 JWTs), `StaticTokenVerifier` (a fixed vendor, for tests) and
  `DevelopmentTokenVerifier` (accepts `dev` or `dev:<vendorId>`, local dev only) —
  turning a bearer token into a `VerifiedVendor` or raising `InvalidTokenError`.
- **Operators** (the admin app, ADR 0059) — an `OperatorTokenVerifier` port with two
  adapters — `Auth0OperatorTokenVerifier` (verifies a token for the operator API's own
  Auth0 audience and requires the `operate` permission) and
  `DevelopmentOperatorTokenVerifier` (signs anyone in as the development operator, local
  dev only) — turning a bearer token into a `VerifiedOperator`, or raising
  `InvalidTokenError`, or `NotAnOperatorError` for a genuine token without the permission.

NestJS wiring lives in [`auth-nestjs`](../auth-nestjs).

## Testing

No specs of its own — a `typecheck`-only Nx project. Its specs live in the `test` project,
under `test/src/auth/`:

```sh
npx nx test test
npx nx typecheck auth
```
