# 0029. Postgres persistence adapters: raw pg, no ORM, migrate-on-boot

Date: 2026-07-05 · Status: Accepted

## Context

The event store, checkpoints, and (next) read models need durable persistence
behind the existing `EventStore` / `Events` / `Checkpoint` / `Subscription` ports
(ADR 0002, 0015). Open choices: an ORM (TypeORM/Prisma) vs a query builder
(Kysely) vs raw `pg` + hand SQL; how and when migrations run; how adapters are
tested; and where the in-memory/Postgres choice binds so the fast test suite
stays Docker-free.

## Decision

- **Raw `pg` (node-postgres) + hand SQL** — a handful of static queries behind the
  ports. No ORM: the query set is tiny and fixed; an ORM adds a schema-mapping
  layer and drift risk for no gain. Kysely (a query builder, not an ORM) stays a
  *maybe* on the read side only.
- **`node-pg-migrate`, one pipeline in `database/migrations/`** (repo root — shared
  by `api` and a future `admin-api`, owned by neither). The `.sql` are copied into
  the app bundle (`dist/apps/api/migrations/`) because Render ships only `dist`.
- **Migrate on boot**: a Nest `OnModuleInit` provider runs the migration `runner`
  before any query; `node-pg-migrate`'s advisory lock serialises concurrent
  instance boots. No separate migrate deploy job.
- **Adapters are contract-tested against real Postgres under Testcontainers** (one
  Docker-gated `test:container` target, excluded from the fast suite). pg-mem
  rejected — it false-greens on concurrency and lacks LISTEN/NOTIFY.
- **Persistence is chosen at the composition root**: `EventSourcingModule.forRoot('postgres' | 'memory')`,
  a dynamic `@Global` module. `'memory'` constructs no pg infrastructure, so the
  fast suite needs no overrides; `'postgres'` wires the pg adapters + pool.

## Consequences

- Zero-dependency core is deliberately given up: `pg` (and `rxjs`) become
  `@market-miam/event-sourcing` package deps. Accepted — the store/checkpoint
  adapters use `import type` for `pg`, so only the app that builds the pool loads
  it at runtime.
- Migrations run identically in tests (Testcontainers `beforeAll`) and prod (on
  boot) — no environment-specific path, no drift between test and prod schema.
- A failed migration hard-crashes boot (`main.ts` `catch → exit 1`) rather than
  serving on a bad schema.
- Testcontainers need Docker; the container suite is gated and kept out of the
  fast unit suite. Local dev runs Postgres via `docker-compose.yml`.
- `apps/api/tsconfig.app.json` uses `moduleResolution: bundler` so `tsc` can read
  `node-pg-migrate`'s exports-only types.
- Step-by-step build + remaining work: `POSTGRES-PLAN.md`. Ordering: ADR 0028.
  Schema: ADR 0005.
