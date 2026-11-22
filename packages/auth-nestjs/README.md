# auth-nestjs

NestJS glue for the [`auth`](../auth) package:

- for vendors, `AuthModule`, `JwtAuthGuard` (verifies the bearer token via a
  `TokenVerifier`), and the `@CurrentVendor` parameter decorator that hands controllers
  the verified vendor;
- for operators, `OperatorAuthModule` and `OperatorAuthGuard` (verifies the bearer token
  via an `OperatorTokenVerifier`), guarding the api's operator routes under `/api/ops`.

## Testing

Covered from the `api` app and the top-level `test` suite (`test/src/auth/`).

```sh
npx nx typecheck auth-nestjs
```
