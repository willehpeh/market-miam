# Architecture Decision Records

Ordered chronologically by when each decision entered the codebase.
Product-level decisions live in `docs/MARKET_MIAM.md`; deliberately
deferred decisions in `docs/DEFERRED.md` (see ADR 0017).

| # | Title | Date |
|---|-------|------|
| [0001](0001-nx-polyglot-monorepo.md) | Nx polyglot monorepo with scoped package boundaries | 2026-05-01 |
| [0002](0002-event-sourcing-cqrs.md) | Event Sourcing + CQRS as the persistence model | 2026-05-01 |
| [0003](0003-subdomain-multi-tenancy.md) | Subdomain-based multi-tenancy | 2026-05-01 |
| [0004](0004-single-bounded-context.md) | Single bounded context for market operations | 2026-05-01 |
| [0005](0005-single-events-table.md) | Single events table with stream and global positions | 2026-05-01 |
| [0006](0006-outside-in-tdd-with-fakes.md) | Outside-in TDD with fakes at boundaries | 2026-05-02 |
| [0007](0007-value-object-constructor-validation.md) | Value objects validated in constructors | 2026-05-02 |
| [0008](0008-no-getters-setters.md) | No getters or setters — behavior-exposing methods only | 2026-05-02 |
| [0009](0009-one-event-per-command-vendor-scoped-streams.md) | One event per command; vendor-scoped stream per aggregate | 2026-05-02 |
| [0010](0010-repositories-over-event-store.md) | Repositories over the event store | 2026-05-09 |
| [0011](0011-nestjs-api-with-cqrs-command-bus.md) | NestJS API with the @nestjs/cqrs command bus | 2026-05-17 |
| [0012](0012-ci-github-actions-nx-affected.md) | CI on GitHub Actions running nx affected | 2026-05-17 |
| [0013](0013-clock-abstraction.md) | Clock abstraction for time-dependent domain logic | 2026-05-23 |
| [0014](0014-event-payload-and-metadata-design.md) | Self-describing payloads; vendorId in metadata | 2026-05-23 |
| [0015](0015-polling-subscriptions-event-handler.md) | Polling subscriptions; Projection and Processor behind EventHandler | 2026-06-03 |
| [0016](0016-read-model-interface-segregation.md) | Read models split into write and read surfaces | 2026-06-06 |
| [0017](0017-deferred-decisions-register.md) | A register for deferred decisions | 2026-06-06 |
| [0018](0018-separate-apps-per-audience.md) | Separate frontend apps per audience | 2026-06-07 |
| [0019](0019-ssr-customer-frontend-only.md) | SSR for the customer frontend only | 2026-06-08 |
| [0020](0020-rename-repertoire-to-catalogue.md) | Rename "Repertoire" to "Catalogue" | 2026-06-08 |
| [0021](0021-delegate-authentication-to-auth0.md) | Delegate authentication to Auth0 | 2026-06-08 |
| [0022](0022-frontend-auth-ports-and-facades.md) | Frontend auth behind ports, NgRx bridge, component facades | 2026-06-09 |
| [0023](0023-tailwind-css.md) | Tailwind CSS for frontend styling | 2026-06-10 |
| [0024](0024-vendor-identity-and-registration.md) | Vendor identity: minted UUID, idempotent registration, no PII in events | 2026-06-10 |
| [0025](0025-crypto-shredding-for-pii-erasure.md) | Crypto-shredding for GDPR erasure of PII | 2026-06-10 |
| [0026](0026-event-based-observability-with-opentelemetry.md) | Event-based observability with OpenTelemetry | 2026-06-21 |
| [0027](0027-market-day-in-vendor-local-time.md) | Market day is the vendor's local calendar date | 2026-06-29 |
| [0028](0028-serialized-appends-global-ordering.md) | Gap-free global ordering via serialized appends | 2026-07-03 |
| [0029](0029-postgres-persistence-adapters.md) | Postgres persistence adapters: raw pg, no ORM, migrate-on-boot | 2026-07-05 |
| [0030](0030-listen-notify-poke-poller.md) | LISTEN/NOTIFY to poke the poller | 2026-07-05 |
| [0031](0031-storefront-publication-readiness-domain-service.md) | Storefront publication: readiness as a cross-aggregate domain service | 2026-07-16 |
| [0032](0032-subdomain-assignment-is-a-publication-requirement.md) | An assigned subdomain is a storefront publication requirement | 2026-07-19 |
| [0033](0033-dish-variants.md) | Dish variants: a dish is flat or variant, never both | 2026-07-24 |
| [0034](0034-atomic-appends-verified-commit.md) | Appends are one atomic statement; COMMIT tags are verified | 2026-07-31 |
| [0035](0035-appends-join-the-ambient-unit-of-work.md) | Appends join the ambient unit of work | 2026-07-31 |
| [0036](0036-checkpoint-advances-are-compare-and-set.md) | Checkpoint advances are compare-and-set; the checkpoint is a fencing token | 2026-08-01 |
| [0037](0037-nested-transactions-join-the-ambient-unit-of-work.md) | A nested transaction() joins the ambient unit of work | 2026-08-01 |
| [0038](0038-in-memory-store-single-log.md) | The in-memory store keeps one log; "appended" is a view, not storage | 2026-08-01 |
| [0039](0039-shredding-reads-degrade-writes-stay-strict.md) | Shredding reads degrade to the sentinel; writes stay strict | 2026-08-01 |
| [0040](0040-master-keyring-lazy-rewrap.md) | Master keys form a versioned keyring; rows re-wrap lazily on read | 2026-08-01 |
| [0041](0041-aad-v2-binds-stream-position.md) | enc:v2 — the AAD binds the event's stream position | 2026-08-01 |
| [0042](0042-listen-lifecycle-single-use-connection-object.md) | LISTEN lifecycle: single-use adapter, reified connection, boot rejects | 2026-08-01 |
| [0043](0043-description-optional-for-publication.md) | A description is no longer a publication requirement | 2026-08-02 |
