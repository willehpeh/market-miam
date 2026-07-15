import { DynamicModule, Inject, Module, OnApplicationShutdown, Optional, Provider, Type } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscoveryModule } from '@nestjs/core';
import { Client, Pool } from 'pg';
import {
  CommandGateway,
  DataKeys,
  Events,
  EventStore,
  InMemoryDataKeys,
  InMemoryEventStore,
  Lineage,
  PiiFields,
  PostgresCheckpoint,
  PostgresDataKeys,
  PostgresEventStore,
  PostgresNotifications,
  PostgresUnitOfWork,
  QueryGateway,
  UnitOfWork,
} from '@market-miam/event-sourcing';
import { ApplicationEventStore } from './application.event-store';
import { masterKey } from './master-key';
import { LineageModule } from '../lineage/lineage.module';
import { TracingCommandGateway } from './tracing/command-gateway';
import { TracingQueryGateway } from './tracing/query-gateway';
import {
  Subscriptions,
  CHECKPOINT_FACTORY,
  EVENT_NOTIFICATIONS,
  POLL_INTERVAL,
  POLLING_ENABLED,
} from './subscriptions';
import { TracingPostgresNotifications } from './tracing/postgres-notifications';

export type Persistence = 'postgres' | 'memory';

// Same in every profile: wrap the given store + data keys in the application event
// store and expose it as both the write port (EventStore) and read port (Events).
// Only the leaves — the store, DataKeys, UnitOfWork — vary per profile.
const applicationEventStore = (piiFields: PiiFields, store: Type<EventStore & Events>): Provider[] => [
  {
    provide: EventStore,
    useFactory: (inner: EventStore & Events, keys: DataKeys, lineage: Lineage) =>
      new ApplicationEventStore(inner, keys, piiFields, lineage),
    inject: [store, DataKeys, Lineage],
  },
  { provide: Events, useExisting: EventStore },
];

const inMemoryPersistence = (piiFields: PiiFields): Provider[] => [
  InMemoryEventStore,
  { provide: DataKeys, useClass: InMemoryDataKeys },
  { provide: UnitOfWork, useValue: UnitOfWork.none() },
  // Poke the poller on every append (no LISTEN/NOTIFY here) so read-after-write is
  // instant in dev; the poll timer stays the backstop. Tests disable polling and
  // drain() directly, so no one subscribes to this there.
  { provide: EVENT_NOTIFICATIONS, useFactory: (store: InMemoryEventStore) => store.notifications(), inject: [InMemoryEventStore] },
  { provide: POLL_INTERVAL, useValue: 1000 },
  // No CHECKPOINT_FACTORY → Subscriptions falls back to its in-memory default.
  ...applicationEventStore(piiFields, InMemoryEventStore),
];

const pool: Provider = {
  provide: Pool,
  useFactory: (config: ConfigService) =>
    new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_CONNECTION_STRING'),
      // ponytail: explicit, sized under the DB connection cap. Steady state per api
      // instance ≈ max + 1 (the dedicated LISTEN client); migrate-on-boot adds one
      // transiently. 10 is safe for a handful of instances on basic-256mb (~97 conns);
      // set DATABASE_POOL_MAX to retune per plan / instance count without a code deploy.
      max: Number(config.get<string>('DATABASE_POOL_MAX')) || 10,
    }),
  inject: [ConfigService],
};

// LISTEN/NOTIFY pokes (their own dedicated pg client) → EVENT_NOTIFICATIONS.
const postgresNotifications: Provider[] = [
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
    useFactory: (notifications: TracingPostgresNotifications) => notifications.notifications(),
    inject: [TracingPostgresNotifications],
  },
];

const postgresPersistence = (piiFields: PiiFields): Provider[] => [
  pool,
  { provide: PostgresEventStore, useFactory: (p: Pool) => new PostgresEventStore(p), inject: [Pool] },
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
  ...applicationEventStore(piiFields, PostgresEventStore),
  ...postgresNotifications,
];

const core: Provider[] = [
  TracingCommandGateway,
  { provide: CommandGateway, useExisting: TracingCommandGateway },
  TracingQueryGateway,
  { provide: QueryGateway, useExisting: TracingQueryGateway },
  { provide: POLLING_ENABLED, useValue: true },
  Subscriptions,
];

@Module({})
export class EventSourcingModule implements OnApplicationShutdown {
  constructor(@Optional() @Inject(Pool) private readonly pool?: Pool) {}

  static forRoot(persistence: Persistence, piiFields: PiiFields = {}): DynamicModule {
    const adapters = persistence === 'postgres' ? postgresPersistence(piiFields) : inMemoryPersistence(piiFields);
    const exported = [EventStore, Events, DataKeys, UnitOfWork, CommandGateway, QueryGateway, Subscriptions];
    return {
      module: EventSourcingModule,
      global: true,
      imports: [CqrsModule, DiscoveryModule, LineageModule],
      providers: [...adapters, ...core],
      // PostgresUnitOfWork is provided (and needed by MarketDaysModule's pg view-store)
      // only on the postgres profile — exporting it on 'memory' would reference an
      // unprovided token.
      exports: persistence === 'postgres' ? [...exported, PostgresUnitOfWork] : exported,
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool?.end();
  }
}
