# MarketMiam

SaaS for itinerant French market food vendors (*traiteurs*). Each vendor gets
their own branded storefront where they publish market-day menus and share their
schedule — a Shopify-style model that preserves the personal vendor–customer
relationship of *marché* culture.

See [`docs/MARKET_MIAM.md`](docs/MARKET_MIAM.md) for the product design.

## Architecture

- **Nx monorepo** in TypeScript, each app on its own framework (NestJS, Angular,
  Astro), with scoped package boundaries.
- **Event Sourcing + CQRS** as the persistence model; a single events table with
  stream and global positions.
- **Hexagonal** — ports and adapters; the domain is framework-agnostic apart from
  a deliberate, narrow dependency on `@nestjs/cqrs` for its commands, queries and
  their handlers (ADR 0011).
- **Multi-tenant** by subdomain: each vendor's storefront on a subdomain of its
  own, `<subdomain>.marketmiam.fr` (ADR 0065).

Decisions are recorded in [`docs/adr/`](docs/adr/README.md).

## Apps (`apps/`)

| App | Stack | What it is |
|-----|-------|------------|
| `api` | NestJS | Main backend: command/query bus, event store, projections/processors, signed image uploads, operator routes, Stripe webhooks. |
| `vendor-frontend` | Angular | Vendor-facing app: onboarding, storefront, catalogue, markets and prices, live market days. |
| `customer-frontend` | Angular (SSR) | Public per-vendor storefront customers visit. |
| `website` | Astro | Marketing / landing site. |
| `design-showcase` | Astro | The design system rendered from `packages/design-system` — tokens, type, component classes, icons. |
| `admin-frontend` | Angular | Operator console over the api's operator routes, signed in through GitHub (`docs/ADMIN-PLAN.md`). |

## Packages (`packages/`)

| Package | What it is |
|---------|------------|
| `market-days` | The Market Days context — vendors, storefronts, catalogues, schedules and market days: aggregates, commands, events, projections, processors. |
| `ordering` | The Ordering context — the vendor's payment account with Stripe, and orders. |
| `event-sourcing` | Event-sourcing kernel — ports, `Aggregate` base, in-memory and Postgres adapters. |
| `shared-kernel` | What the contexts must agree on — `VendorId`, `MarketId`, vendor-scoped streams. |
| `common` | Reusable value objects — dates, times, email, phone, URL, image refs. |
| `auth` | Token verification for vendors and operators (Auth0 / static / development), framework-agnostic. |
| `auth-nestjs` | NestJS auth glue — vendor and operator guards, `@CurrentVendor` decorator, modules. |
| `design-system` | The brand — tokens, the Tailwind theme and self-hosted fonts, for every app with a face. |

## Development

```sh
npx nx serve api               # run the backend
npx nx serve vendor-frontend   # run a frontend
npx nx test test               # the social test suite, covering the domain packages (see test/README.md)
npx nx test <project>          # an app's own tests: api, vendor-, customer- or admin-frontend
npx nx build <project>         # production build
npx nx graph                   # explore the project graph
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) — contributions are welcome, but read
it first: the architecture is opinionated on purpose. Community expectations
live in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

MarketMiam is a commercial product whose code is free software — permanently.
The hosted service is run for profit, and the AGPL is chosen deliberately so
that anyone can study, self-host, fork, or build on the code (provided they
share their source in turn), and so that the code can never be taken
closed-source by anyone, the author included. There is no CLA, on purpose:
see [CONTRIBUTING.md](CONTRIBUTING.md).

Copyright © 2026 William Alexander

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the [GNU Affero General Public License](./LICENSE) for
more details.
