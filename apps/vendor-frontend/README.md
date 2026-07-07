# vendor-frontend

The vendor-facing Angular app. Where a vendor signs up, onboards, and manages
their storefront, market schedule, and dashboard.

Uses Auth0 for authentication (behind ports with an NgRx bridge), Angular Signal
Forms, and Tailwind CSS. Areas under `src/app/`: `onboarding`, `storefront`,
`dashboard`, `landing`, `vendor`, `core`.

```sh
npx nx serve vendor-frontend
npx nx test vendor-frontend
npx nx build vendor-frontend
```
