# auth

Token verification, framework-agnostic. A `TokenVerifier` port with two
adapters — `Auth0TokenVerifier` (verifies Auth0 JWTs) and `StaticTokenVerifier`
(for tests/local) — turning a bearer token into a `VerifiedVendor` or raising
`InvalidTokenError`.

NestJS wiring lives in [`auth-nestjs`](../auth-nestjs).

## Testing

```sh
npx nx test auth
```
