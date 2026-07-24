import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, Pool } from 'pg';
import {
  DataKeys,
  PostgresCheckpoint,
  PostgresDataKeys,
  PostgresEventStore,
  PostgresNotifications,
  PostgresUnitOfWork,
  UnitOfWork,
} from '@market-miam/event-sourcing';
import {
  CatalogueViews,
  CatalogueViewStore,
  MarketScheduleViews,
  MarketScheduleViewStore,
  PostgresCatalogueViews,
  PostgresMarketScheduleViews,
  PostgresSubdomainRegistry,
  PostgresVendorStorefrontViews,
  SubdomainRegistry,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { PERSISTED_EVENTS } from '../event-sourcing/application.event-store';
import { CHECKPOINT_FACTORY, EVENT_NOTIFICATIONS } from '../event-sourcing/subscriptions';
import { TracingPostgresNotifications } from '../event-sourcing/tracing/postgres-notifications';
import { masterKey } from '../event-sourcing/master-key';
import { Migrations } from '../database/migrations';

const pool = {
  provide: Pool,
  useFactory: (config: ConfigService) =>
    new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_CONNECTION_STRING'),
      // ponytail: explicit, sized under the DB connection cap. Steady state per api
      // instance ≈ max + 1 (the dedicated LISTEN client); migrate-on-boot adds one
      // transiently. 10 is safe for a handful of instances on basic-256mb (~97 conns);
      // set DATABASE_POOL_MAX to retune per plan / instance count without a code deploy.
      max: Number(config.get<string>('DATABASE_POOL_MAX')) || 10,
      // Keep one connection alive rather than raising idleTimeoutMillis above the poll
      // interval: the timeout fix would silently re-break the day the interval changes.
      // pg-pool only arms its idle-eviction timer while the pool is above min, so this
      // pins exactly one connection; burst extras still evict on the 10s default.
      // It is an eviction floor, not a warm-up — the first poll after boot fills it.
      min: 1,
      // Long-idle connections get dropped by the network without pg noticing until the
      // next query fails. TCP keepalive surfaces the death instead.
      keepAlive: true,
    }),
  inject: [ConfigService],
};

// LISTEN/NOTIFY pokes (their own dedicated pg client) → EVENT_NOTIFICATIONS.
const notifications = [
  {
    provide: PostgresNotifications,
    useFactory: (config: ConfigService) =>
      new PostgresNotifications(
        () => new Client({ connectionString: config.getOrThrow<string>('DATABASE_CONNECTION_STRING') }),
      ),
    inject: [ConfigService],
  },
  {
    provide: TracingPostgresNotifications,
    useFactory: (inner: PostgresNotifications) => new TracingPostgresNotifications(inner),
    inject: [PostgresNotifications],
  },
  {
    provide: EVENT_NOTIFICATIONS,
    useFactory: (traced: TracingPostgresNotifications) => traced.notifications(),
    inject: [TracingPostgresNotifications],
  },
];

const views = [
  {
    provide: PostgresVendorStorefrontViews,
    useFactory: (uow: PostgresUnitOfWork) => new PostgresVendorStorefrontViews(uow),
    inject: [PostgresUnitOfWork],
  },
  { provide: VendorStorefrontViews, useExisting: PostgresVendorStorefrontViews },
  { provide: VendorStorefrontViewStore, useExisting: PostgresVendorStorefrontViews },
  {
    provide: PostgresCatalogueViews,
    useFactory: (uow: PostgresUnitOfWork) => new PostgresCatalogueViews(uow),
    inject: [PostgresUnitOfWork],
  },
  { provide: CatalogueViews, useExisting: PostgresCatalogueViews },
  { provide: CatalogueViewStore, useExisting: PostgresCatalogueViews },
  {
    provide: PostgresMarketScheduleViews,
    useFactory: (uow: PostgresUnitOfWork) => new PostgresMarketScheduleViews(uow),
    inject: [PostgresUnitOfWork],
  },
  { provide: MarketScheduleViews, useExisting: PostgresMarketScheduleViews },
  { provide: MarketScheduleViewStore, useExisting: PostgresMarketScheduleViews },
  {
    provide: PostgresSubdomainRegistry,
    useFactory: (uow: PostgresUnitOfWork) => new PostgresSubdomainRegistry(uow),
    inject: [PostgresUnitOfWork],
  },
  { provide: SubdomainRegistry, useExisting: PostgresSubdomainRegistry },
];

// Every adapter the postgres profile plugs in, plus the Pool they share and the
// migrations that must run before any of them query. Global so the composition root
// is the only place that names a profile: everything downstream asks for the port
// (EventStore, CatalogueViews, ...) and stays unaware of which module answered.
@Global()
@Module({
  providers: [
    pool,
    { provide: PERSISTED_EVENTS, useFactory: (p: Pool) => new PostgresEventStore(p), inject: [Pool] },
    {
      provide: DataKeys,
      useFactory: (p: Pool, config: ConfigService) => new PostgresDataKeys(p, masterKey(config)),
      inject: [Pool, ConfigService],
    },
    { provide: PostgresUnitOfWork, useFactory: (p: Pool) => new PostgresUnitOfWork(p), inject: [Pool] },
    { provide: UnitOfWork, useExisting: PostgresUnitOfWork },
    {
      provide: CHECKPOINT_FACTORY,
      useFactory: (uow: PostgresUnitOfWork) => (name: string) => new PostgresCheckpoint(uow, name),
      inject: [PostgresUnitOfWork],
    },
    ...notifications,
    ...views,
    Migrations,
  ],
  exports: [
    PERSISTED_EVENTS,
    DataKeys,
    UnitOfWork,
    EVENT_NOTIFICATIONS,
    CHECKPOINT_FACTORY,
    VendorStorefrontViews,
    VendorStorefrontViewStore,
    CatalogueViews,
    CatalogueViewStore,
    MarketScheduleViews,
    MarketScheduleViewStore,
    SubdomainRegistry,
  ],
})
export class PostgresPersistenceModule implements OnApplicationShutdown {
  constructor(private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
