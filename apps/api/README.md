# api

The main MarketMiam backend (NestJS + `@nestjs/cqrs`). Wires the domain packages
(`market-days`, `ordering`) to real infrastructure: the event store and read models,
polling subscriptions running projections and processors, auth for vendors and
operators, signed image uploads (Cloudinary), Stripe's webhooks, and OpenTelemetry
tracing.

Key areas under `src/app/`: `event-sourcing` (adapters, subscriptions, tracing),
`persistence` (Postgres or in memory), `database` (migrations), `lineage`
(correlation/causation), `market-days` (controllers, read models), `ordering`
(the payment account and Stripe's webhooks, ADRs 0067, 0069), `ops` (the operator routes
under `/api/ops`, ADR 0059), `signed-uploads`.

```sh
npx nx serve api                # dev server
npx nx test api                 # tests
npx nx scenario api             # whole lifecycles against a real Postgres (nightly)
npx nx run api:test:tenant      # against a real Auth0 test tenant, by hand
npx nx build api                # production build
```

Persistence uses Postgres via raw `pg` (see ADR 0029); `docker-compose.yml` at
the repo root brings up a local database.
