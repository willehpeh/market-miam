# api

The main MarketMiam backend (NestJS + `@nestjs/cqrs`). Wires the domain package
(`market-days`) to real infrastructure: the event store and read models,
polling subscriptions running projections and processors, auth, signed image
uploads (Cloudinary), and OpenTelemetry tracing.

Key areas under `src/app/`: `event-sourcing` (adapters, subscriptions),
`market-days` (controllers, projections), `database`, `lineage`
(correlation/causation), `signed-uploads`.

```sh
npx nx serve api     # dev server
npx nx test api      # tests
npx nx build api     # production build
```

Persistence uses Postgres via raw `pg` (see ADR 0029); `docker-compose.yml` at
the repo root brings up a local database.
