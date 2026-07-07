import { DynamicModule, Inject, Module, OnApplicationShutdown, Optional, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscoveryModule } from '@nestjs/core';
import { EMPTY } from 'rxjs';
import { Client, Pool } from 'pg';
import {
  CommandDispatcher,
  DataKeys,
  Events,
  EventStore,
  InMemoryDataKeys,
  InMemoryEventStore,
  MessageContext,
  PiiFields,
  PostgresCheckpoint,
  PostgresDataKeys,
  PostgresEventStore,
  PostgresNotifications,
  PostgresUnitOfWork,
  QueryDispatcher,
  UnitOfWork,
} from '@market-miam/event-sourcing';
import { ApplicationEventStore } from './application.event-store';
import { masterKey } from './master-key';
import { MessageContextModule } from '../message-context/message-context.module';
import { TracingCommandDispatcher } from './tracing.command-dispatcher';
import { TracingQueryDispatcher } from './tracing.query-dispatcher';
import {
  Subscriptions,
  CHECKPOINT_FACTORY,
  EVENT_NOTIFICATIONS,
  POLLING_ENABLED,
} from './subscriptions';
import { TracingPostgresNotifications } from './tracing.postgres-notifications';

export type Persistence = 'postgres' | 'memory';

const inMemoryPersistence = (piiFields: PiiFields): Provider[] => [
  InMemoryEventStore,
  InMemoryDataKeys,
  { provide: DataKeys, useExisting: InMemoryDataKeys },
  {
    provide: EventStore,
    useFactory: (inner: InMemoryEventStore, keys: DataKeys, context: MessageContext) =>
      new ApplicationEventStore(inner, keys, piiFields, context),
    inject: [InMemoryEventStore, DataKeys, MessageContext],
  },
  { provide: Events, useExisting: EventStore },
  { provide: UnitOfWork, useValue: UnitOfWork.none() },
  // No CHECKPOINT_FACTORY → Subscriptions falls back to its in-memory default.
  { provide: EVENT_NOTIFICATIONS, useValue: EMPTY },
];

const postgresPersistence = (piiFields: PiiFields): Provider[] => [
  {
    provide: Pool,
    useFactory: (config: ConfigService) =>
      new Pool({ connectionString: config.getOrThrow<string>('DATABASE_CONNECTION_STRING') }),
    inject: [ConfigService],
  },
  { provide: PostgresEventStore, useFactory: (pool: Pool) => new PostgresEventStore(pool), inject: [Pool] },
  { provide: PostgresUnitOfWork, useFactory: (pool: Pool) => new PostgresUnitOfWork(pool), inject: [Pool] },
  { provide: UnitOfWork, useExisting: PostgresUnitOfWork },
  {
    provide: PostgresDataKeys,
    useFactory: (pool: Pool, config: ConfigService) => new PostgresDataKeys(pool, masterKey(config)),
    inject: [Pool, ConfigService],
  },
  { provide: DataKeys, useExisting: PostgresDataKeys },
  {
    provide: EventStore,
    useFactory: (inner: PostgresEventStore, keys: DataKeys, context: MessageContext) =>
      new ApplicationEventStore(inner, keys, piiFields, context),
    inject: [PostgresEventStore, DataKeys, MessageContext],
  },
  { provide: Events, useExisting: EventStore },
  {
    provide: CHECKPOINT_FACTORY,
    useFactory: (uow: PostgresUnitOfWork) => (name: string) => new PostgresCheckpoint(uow, name),
    inject: [PostgresUnitOfWork],
  },
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

const core: Provider[] = [
  TracingCommandDispatcher,
  { provide: CommandDispatcher, useExisting: TracingCommandDispatcher },
  TracingQueryDispatcher,
  { provide: QueryDispatcher, useExisting: TracingQueryDispatcher },
  { provide: POLLING_ENABLED, useValue: true },
  Subscriptions,
];

@Module({})
export class EventSourcingModule implements OnApplicationShutdown {
  constructor(@Optional() @Inject(Pool) private readonly pool?: Pool) {}

  static forRoot(persistence: Persistence, piiFields: PiiFields = {}): DynamicModule {
    const adapters = persistence === 'postgres' ? postgresPersistence(piiFields) : inMemoryPersistence(piiFields);
    const exported = [EventStore, Events, UnitOfWork, CommandDispatcher, QueryDispatcher, Subscriptions];
    return {
      module: EventSourcingModule,
      global: true,
      imports: [CqrsModule, DiscoveryModule, MessageContextModule],
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
