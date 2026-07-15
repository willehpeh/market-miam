import { DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscoveryModule } from '@nestjs/core';
import {
  CommandGateway,
  DataKeys,
  Events,
  EventStore,
  Lineage,
  PiiFields,
  QueryGateway,
} from '@market-miam/event-sourcing';
import { ApplicationEventStore, PERSISTED_EVENTS } from './application.event-store';
import { LineageModule } from '../lineage/lineage.module';
import { TracingCommandGateway } from './tracing/command-gateway';
import { TracingQueryGateway } from './tracing/query-gateway';
import { Subscriptions, POLLING_ENABLED } from './subscriptions';

// The profile-independent half of event sourcing: wrap whichever leaf store the
// imported persistence module provides, and expose it as both the write port
// (EventStore) and the read port (Events). The leaves live in
// app/persistence/{in-memory,postgres}-persistence.module.ts.
@Module({})
export class EventSourcingModule {
  static forRoot(piiFields: PiiFields = {}): DynamicModule {
    return {
      module: EventSourcingModule,
      global: true,
      imports: [CqrsModule, DiscoveryModule, LineageModule],
      providers: [
        {
          provide: EventStore,
          useFactory: (inner: EventStore & Events, keys: DataKeys, lineage: Lineage) =>
            new ApplicationEventStore(inner, keys, piiFields, lineage),
          inject: [PERSISTED_EVENTS, DataKeys, Lineage],
        },
        { provide: Events, useExisting: EventStore },
        TracingCommandGateway,
        { provide: CommandGateway, useExisting: TracingCommandGateway },
        TracingQueryGateway,
        { provide: QueryGateway, useExisting: TracingQueryGateway },
        { provide: POLLING_ENABLED, useValue: true },
        Subscriptions,
      ],
      exports: [EventStore, Events, CommandGateway, QueryGateway, Subscriptions],
    };
  }
}
