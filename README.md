# MarketMiam

SaaS for itinerant French market food vendors (*traiteurs*). Each vendor gets
their own branded storefront where they publish market-day menus, share their
schedule, and gather demand signals from regulars — a Shopify-style model that
preserves the personal vendor–customer relationship of *marché* culture.

See [`docs/MARKET_MIAM.md`](docs/MARKET_MIAM.md) for the product design.

## Architecture

- **Nx monorepo**, polyglot with scoped package boundaries.
- **Event Sourcing + CQRS** as the persistence model; a single events table with
  stream and global positions.
- **Hexagonal** — ports and adapters; the domain is framework-agnostic.
- **Multi-tenant** by subdomain (`chez-mohamed.example.fr`).

Decisions are recorded in [`docs/adr/`](docs/adr/README.md).

## Apps (`apps/`)

| App | Stack | What it is |
|-----|-------|------------|
| `api` | NestJS | Main backend: command/query bus, event store, projections/processors, uploads. |
| `vendor-frontend` | Angular | Vendor-facing app: onboarding, storefront, dashboard. |
| `customer-frontend` | Angular (SSR) | Public per-vendor storefront customers visit. |
| `website` | Astro | Marketing / landing site. |
| `admin-api` | NestJS | Internal admin backend (early stage). |
| `admin-frontend` | Angular | Internal admin app (early stage). |

## Packages (`packages/`)

| Package | What it is |
|---------|------------|
| `market-days` | The domain: aggregates, commands, events, projections, repositories. |
| `event-sourcing` | Event-sourcing kernel — ports, `Aggregate` base, in-memory adapters. |
| `shared-kernel` | Cross-context identifiers (`VendorId`, `MarketId`). |
| `common` | Reusable value objects — dates, times, email, phone, URL, image refs. |
| `auth` | Token verification (Auth0 / static), framework-agnostic. |
| `auth-nestjs` | NestJS auth glue — guard, `@CurrentVendor` decorator, module. |

## Development

```sh
npx nx serve api               # run the backend
npx nx serve vendor-frontend   # run a frontend
npx nx test test               # the social test suite (see test/README.md)
npx nx test <project>          # a project's own tests
npx nx build <project>         # production build
npx nx graph                   # explore the project graph
```

## License

Copyright © 2026 William Alexander

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the [GNU Affero General Public License](./LICENSE) for
more details.
