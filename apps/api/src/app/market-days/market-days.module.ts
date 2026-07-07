import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandDispatcher, EventStore } from '@market-miam/event-sourcing';
import { Clock, DateClock } from '@market-miam/common';
import {
  AddItemToCatalogueHandler,
  Calendars,
  Catalogues,
  ChangeItemPriceHandler,
  EditStorefrontInformationHandler,
  FindVendorStorefrontHandler,
  InMemoryVendorStorefrontViews,
  MarkItemAsSoldOutHandler,
  MarketDays,
  OpenStorefrontHandler,
  PlanItemsForMarketDayHandler,
  RegisterMarketScheduleHandler,
  RegisterVendorHandler,
  RetireItemHandler,
  SetStorefrontCoverPhotoHandler,
  OpensStorefronts,
  Storefronts,
  UnplanItemFromMarketDayHandler,
  Vendors,
  VendorScopedEvents,
  VendorStorefrontViewProjection,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { SignedUploads, signedUploadsFor } from '../signed-uploads';
import { VendorsController } from './vendors.controller';
import { StorefrontController } from './storefront.controller';

const clock = [{ provide: Clock, useClass: DateClock }];

const signedUploads = [
  { provide: SignedUploads, useFactory: signedUploadsFor, inject: [ConfigService, Clock] },
];

const repositories = [
  { provide: VendorScopedEvents, useFactory: (store: EventStore) => new VendorScopedEvents(store), inject: [EventStore] },
  { provide: Vendors, useFactory: (events: VendorScopedEvents) => new Vendors(events), inject: [VendorScopedEvents] },
  { provide: Catalogues, useFactory: (events: VendorScopedEvents) => new Catalogues(events), inject: [VendorScopedEvents] },
  { provide: Calendars, useFactory: (events: VendorScopedEvents) => new Calendars(events), inject: [VendorScopedEvents] },
  { provide: Storefronts, useFactory: (events: VendorScopedEvents) => new Storefronts(events), inject: [VendorScopedEvents] },
  {
    provide: MarketDays,
    useFactory: (events: VendorScopedEvents, appClock: Clock) => new MarketDays(events, appClock),
    inject: [VendorScopedEvents, Clock],
  },
];

const readModel = [
  InMemoryVendorStorefrontViews,
  { provide: VendorStorefrontViews, useExisting: InMemoryVendorStorefrontViews },
  { provide: VendorStorefrontViewStore, useExisting: InMemoryVendorStorefrontViews },
  {
    provide: VendorStorefrontViewProjection,
    useFactory: (store: VendorStorefrontViewStore) => new VendorStorefrontViewProjection(store),
    inject: [VendorStorefrontViewStore],
  },
];

const processors = [
  {
    provide: OpensStorefronts,
    useFactory: (dispatcher: CommandDispatcher) => new OpensStorefronts(dispatcher),
    inject: [CommandDispatcher],
  },
];

const commandHandlers = [
  RegisterVendorHandler,
  AddItemToCatalogueHandler,
  ChangeItemPriceHandler,
  RetireItemHandler,
  RegisterMarketScheduleHandler,
  PlanItemsForMarketDayHandler,
  UnplanItemFromMarketDayHandler,
  MarkItemAsSoldOutHandler,
  EditStorefrontInformationHandler,
  SetStorefrontCoverPhotoHandler,
  OpenStorefrontHandler,
];

const queryHandlers = [FindVendorStorefrontHandler];

@Module({
  // EventStore / CommandDispatcher / QueryDispatcher come from the global
  // EventSourcingModule.forRoot(...) imported at the composition root.
  controllers: [VendorsController, StorefrontController],
  providers: [
    ...clock,
    ...signedUploads,
    ...repositories,
    ...readModel,
    ...processors,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class MarketDaysModule {}
