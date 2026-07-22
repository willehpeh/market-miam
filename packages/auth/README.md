# auth

Token verification, framework-agnostic. A `TokenVerifier` port with three
adapters — `Auth0TokenVerifier` (verifies Auth0 JWTs), `StaticTokenVerifier`
(a fixed vendor, for tests) and `DevelopmentTokenVerifier` (accepts `dev` or
`dev:<vendorId>`, local dev only) — turning a bearer token into a
`VerifiedVendor` or raising `InvalidTokenError`.

NestJS wiring lives in [`auth-nestjs`](../auth-nestjs).

## Testing

```sh
npx nx test auth
```
