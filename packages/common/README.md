# common

Reusable value objects and primitives, validated in their constructors:
`LocalDate`, `LocalTime`, `LocalDateTime`, `Week`, `Instant`, `Email`,
`SignInAddress` (an account's sign-in email, compared regardless of case as Auth0
does), `PhoneNumber`, `Url`, `ImageReference`, plus a `Clock` abstraction
(`DateClock`), the `DomainError` base that a global filter maps to HTTP 400, and the
photo-upload limits and preview transformations the api and the vendor app share.

Framework-agnostic; used across the domain and apps.

## Testing

No specs of its own — a `typecheck`-only Nx project. Its specs live in the `test`
project, under `test/src/common/`:

```sh
npx nx test test
npx nx typecheck common
```
