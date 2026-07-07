# auth-nestjs

NestJS glue for the [`auth`](../auth) package: `AuthModule`, `JwtAuthGuard`
(verifies the bearer token via a `TokenVerifier`), and the `@CurrentVendor`
parameter decorator that hands controllers the verified vendor.

## Testing

Covered from the `api` app and the top-level `test` suite.

```sh
npx nx typecheck auth-nestjs
```
