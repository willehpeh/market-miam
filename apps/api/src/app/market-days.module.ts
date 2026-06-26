import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CommandDispatcher, EventStore } from '@market-monster/event-sourcing';
import { Clock, DateClock } from '@market-monster/common';
import {
  AddItemToCatalogueHandler,
  Calendars,
  Catalogues,
  ChangeItemPriceHandler,
  EditStorefrontInformationHandler,
  InMemoryVendorStorefrontViews,
  MarkItemAsSoldOutHandler,
  MarketDays,
  OpenStorefrontHandler,
  PlanItemsForMarketDayHandler,
  RegisterMarketScheduleHandler,
  RegisterVendorHandler,
  RetireItemHandler,
  SetStorefrontCoverPhotoHandler,
  StorefrontOpener,
  Storefronts,
  UnplanItemFromMarketDayHandler,
  Vendors,
  VendorStorefrontViewProjection,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-monster/market-days';
import { EventSourcingModule } from './event-sourcing.module';
import { MessageContextMiddleware } from './message-context.middleware';
import { VendorsController } from './vendors.controller';
import { StorefrontController } from './storefront.controller';

const clock = [{ provide: Clock, useClass: DateClock }];

const repositories = [
  { provide: Vendors, useFactory: (store: EventStore) => new Vendors(store), inject: [EventStore] },
  { provide: Catalogues, useFactory: (store: EventStore) => new Catalogues(store), inject: [EventStore] },
  { provide: Calendars, useFactory: (store: EventStore) => new Calendars(store), inject: [EventStore] },
  { provide: Storefronts, useFactory: (store: EventStore) => new Storefronts(store), inject: [EventStore] },
  {
    provide: MarketDays,
    useFactory: (store: EventStore, appClock: Clock) => new MarketDays(store, appClock),
    inject: [EventStore, Clock],
  },
];

// The storefront read model: one in-memory store serves both the projection's
// write surface and the query read surface. The @Projects-decorated projection
// is discovered and driven by the ConsumerRunner (in EventSourcingModule).
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

// Reacts to VendorRegistered by dispatching OpenStorefront; discovered and
// driven (with continuation context) by the ConsumerRunner.
const processors = [
  {
    provide: StorefrontOpener,
    useFactory: (dispatcher: CommandDispatcher) => new StorefrontOpener(dispatcher),
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

@Module({
  imports: [EventSourcingModule],
  controllers: [VendorsController, StorefrontController],
  providers: [
    ...clock,
    MessageContextMiddleware,
    ...repositories,
    ...readModel,
    ...processors,
    ...commandHandlers,
  ],
})
export class MarketDaysModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MessageContextMiddleware).forRoutes(VendorsController, StorefrontController);
  }
}
