# vendor-frontend

The vendor-facing Angular app. Where an invited vendor (ADR 0060) signs in,
onboards, and runs their stall: storefront and legal identity, catalogue, markets and
their prices, each market day live and its bilan, and the QR code to their storefront.

Uses Auth0 for authentication (behind ports with an NgRx bridge, ADR 0022), NgRx
state behind component facades, Angular Signal Forms, and Tailwind CSS. Areas under
`src/app/`: `landing`, `onboarding`, `dashboard`, `vendor`, `storefront`,
`legal-identity`, `catalogue`, `markets`, `market-prices`, `market-days`,
`selling-record`, `qr-code`, and `core` (auth, layout, notifications).

```sh
npx nx serve vendor-frontend
npx nx test vendor-frontend
npx nx build vendor-frontend
```
