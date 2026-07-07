# market-days

The domain package — the heart of MarketMiam. Vendors, storefronts, market
schedules, and the market-day lifecycle live here as event-sourced aggregates.

## What's here

- **Aggregates & value objects** — `Storefront`, `Calendar`, vendor registration,
  and the commands/events that drive them (e.g. `register-vendor`,
  `open-storefront`, `edit-storefront-information`, `retire-item`).
- **Command handlers** — one per command, each raising a single event.
- **Repositories** — `VendorScopedRepository`, `VendorScopedEvents`: load and
  save aggregate streams scoped to a vendor.

Pure domain: framework-agnostic, no NestJS. It builds on `event-sourcing`,
`shared-kernel`, and `common`.

## Testing

```sh
npx nx test market-days
```
