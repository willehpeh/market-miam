# common

Reusable value objects and primitives, validated in their constructors:
`LocalDate`, `LocalTime`, `Instant`, `Email`, `PhoneNumber`, `Url`,
`ImageReference`, plus a `Clock` abstraction (`DateClock`) and the `DomainError`
base that a global filter maps to HTTP 400.

Framework-agnostic; used across the domain and apps.

## Testing

```sh
npx nx test common
```
