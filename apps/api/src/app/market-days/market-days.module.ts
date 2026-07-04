import { Module } from '@nestjs/common';
import { CommandDispatcher, EventStore } from '@market-monster/event-sourcing';
import { Clock, DateClock } from '@market-monster/common';
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
} from '@market-monster/market-days';
import { EventSourcingModule } from '../event-sourcing/event-sourcing.module';
import { VendorsController } from './vendors.controller';
import { StorefrontController } from './storefront.controller';

const clock = [{ provide: Clock, useClass: DateClock }];

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
  imports: [EventSourcingModule],
  controllers: [VendorsController, StorefrontController],
  providers: [
    ...clock,
    ...repositories,
    ...readModel,
    ...processors,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class MarketDaysModule {}
