import { DynamicModule, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscoveryModule } from '@nestjs/core';
import {
  ApplicationEventStore,
  CommandGateway,
  DataKeys,
  Events,
  EventStore,
  KeyScopes,
  Lineage,
  PiiFields,
  QueryGateway,
  ShreddingEventStore,
} from '@market-miam/event-sourcing';
import { VENDOR_ID_METADATA_KEY, VendorScopedEvents } from '@market-miam/shared-kernel';
import { LineageModule } from '../lineage/lineage.module';
import { TracingCommandGateway } from './tracing/command-gateway';
import { spanMetadata } from './tracing/span-metadata';
import { TracingQueryGateway } from './tracing/query-gateway';
import { Subscriptions } from './subscriptions';
import { HealthController } from './health.controller';

// The leaf adapter ApplicationEventStore wraps. One token for "whatever store the
// profile plugs in", so the wrapping stays written once instead of once per profile.
export const PERSISTED_EVENTS = Symbol('PERSISTED_EVENTS');

// The profile-independent half of event sourcing: wrap whichever leaf store the
// imported persistence module provides, and expose it as both the write port
// (EventStore) and the read port (Events). The leaves live in
// app/persistence/{in-memory,postgres}-persistence.module.ts.
@Module({})
export class EventSourcingModule {
  static forRoot(piiFields: PiiFields = {}, keyScopes: KeyScopes = {}): DynamicModule {
    return {
      module: EventSourcingModule,
      global: true,
      imports: [CqrsModule, DiscoveryModule, LineageModule],
      controllers: [HealthController],
      providers: [
        {
          // The vendor's id in append metadata names the PII subject — application
          // policy, decided here, not in the package.
          provide: EventStore,
          useFactory: (inner: EventStore & Events, keys: DataKeys, lineage: Lineage) =>
            new ApplicationEventStore(
              new ShreddingEventStore(inner, keys, piiFields, VENDOR_ID_METADATA_KEY, keyScopes),
              lineage,
              spanMetadata,
            ),
          inject: [PERSISTED_EVENTS, DataKeys, Lineage],
        },
        { provide: Events, useExisting: EventStore },
        { provide: VendorScopedEvents, useFactory: (store: EventStore) => new VendorScopedEvents(store), inject: [EventStore] },
        TracingCommandGateway,
        { provide: CommandGateway, useExisting: TracingCommandGateway },
        TracingQueryGateway,
        { provide: QueryGateway, useExisting: TracingQueryGateway },
        // PollSchedule comes from the persistence profile — the wake policy is
        // inseparable from where the pokes come from.
        Subscriptions,
      ],
      exports: [EventStore, Events, VendorScopedEvents, CommandGateway, QueryGateway, Subscriptions],
    };
  }
}
