import { Global, Module } from '@nestjs/common';
import { DataKeys, InMemoryDataKeys, InMemoryEventStore, UnitOfWork } from '@market-miam/event-sourcing';
import {
  CatalogueViews,
  CatalogueViewStore,
  InMemoryCatalogueViews,
  InMemoryMarketScheduleViews,
  InMemorySubdomainRegistry,
  InMemoryVendorStorefrontViews,
  MarketScheduleViews,
  MarketScheduleViewStore,
  SubdomainRegistry,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { PERSISTED_EVENTS } from '../event-sourcing/event-sourcing.module';
import { PollSchedule } from '../event-sourcing/poll-schedule';

// Every adapter the memory profile plugs in — nothing here survives a restart.
// Global so the composition root is the only place that names a profile: everything
// downstream asks for the port (EventStore, CatalogueViews, ...) and stays unaware
// of which module answered.
@Global()
@Module({
  providers: [
    InMemoryEventStore,
    { provide: PERSISTED_EVENTS, useExisting: InMemoryEventStore },
    { provide: DataKeys, useClass: InMemoryDataKeys },
    { provide: UnitOfWork, useValue: UnitOfWork.none() },
    // Poke the poller on every append (no LISTEN/NOTIFY here) so read-after-write is
    // instant in dev, with a tight 1s backstop. Tests override this with
    // PollSchedule.never() and drain() directly.
    {
      provide: PollSchedule,
      useFactory: (store: InMemoryEventStore) => PollSchedule.pokedWithBackstop(store.notifications(), 1000),
      inject: [InMemoryEventStore],
    },
    // No CHECKPOINT_FACTORY → Subscriptions falls back to its in-memory default.
    InMemoryVendorStorefrontViews,
    { provide: VendorStorefrontViews, useExisting: InMemoryVendorStorefrontViews },
    { provide: VendorStorefrontViewStore, useExisting: InMemoryVendorStorefrontViews },
    InMemoryCatalogueViews,
    { provide: CatalogueViews, useExisting: InMemoryCatalogueViews },
    { provide: CatalogueViewStore, useExisting: InMemoryCatalogueViews },
    InMemoryMarketScheduleViews,
    { provide: MarketScheduleViews, useExisting: InMemoryMarketScheduleViews },
    { provide: MarketScheduleViewStore, useExisting: InMemoryMarketScheduleViews },
    InMemorySubdomainRegistry,
    { provide: SubdomainRegistry, useExisting: InMemorySubdomainRegistry },
  ],
  exports: [
    PERSISTED_EVENTS,
    DataKeys,
    UnitOfWork,
    PollSchedule,
    VendorStorefrontViews,
    VendorStorefrontViewStore,
    CatalogueViews,
    CatalogueViewStore,
    MarketScheduleViews,
    MarketScheduleViewStore,
    SubdomainRegistry,
  ],
})
export class InMemoryPersistenceModule {}
