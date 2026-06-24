import { randomUUID } from 'node:crypto';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  Events,
  EventStore,
  InMemoryCheckpoint,
  InMemoryEventStore,
  InMemorySubscription,
  MessageContext,
  MessageContextDispatcher,
  MessageContextEventStore,
  Subscription,
} from '@market-monster/event-sourcing';
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
  PlanItemsForMarketDayHandler,
  RegisterMarketScheduleHandler,
  RegisterVendorHandler,
  RetireItemHandler,
  SetStorefrontCoverPhotoHandler,
  Storefronts,
  UnplanItemFromMarketDayHandler,
  Vendors,
  VendorStorefrontViewProjection,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-monster/market-days';
import { CommandDispatcher } from './command-dispatcher';
import { TracingEventStore } from './tracing.event-store';
import { MessageContextMiddleware } from './message-context.middleware';
import { VendorsController } from './vendors.controller';
import { StorefrontController } from './storefront.controller';

const clock = [{ provide: Clock, useClass: DateClock }];

const messageContext = [
  MessageContext,
  {
    provide: MessageContextDispatcher,
    useFactory: (context: MessageContext) =>
      new MessageContextDispatcher(context, () => randomUUID()),
    inject: [MessageContext],
  },
  MessageContextMiddleware,
];

const eventStore = [
  InMemoryEventStore,
  {
    provide: MessageContextEventStore,
    useFactory: (inner: InMemoryEventStore, context: MessageContext) =>
      new MessageContextEventStore(inner, context),
    inject: [InMemoryEventStore, MessageContext],
  },
  {
    provide: EventStore,
    useFactory: (inner: MessageContextEventStore) => new TracingEventStore(inner),
    inject: [MessageContextEventStore],
  },
];

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
// write surface and the query read surface. A subscription drives the
// projection off the global event log via a checkpoint; the poller (separate)
// calls poll() on a schedule.
const readModel = [
  InMemoryVendorStorefrontViews,
  { provide: VendorStorefrontViews, useExisting: InMemoryVendorStorefrontViews },
  { provide: VendorStorefrontViewStore, useExisting: InMemoryVendorStorefrontViews },
  { provide: Events, useExisting: InMemoryEventStore },
  {
    provide: VendorStorefrontViewProjection,
    useFactory: (store: VendorStorefrontViewStore) => new VendorStorefrontViewProjection(store),
    inject: [VendorStorefrontViewStore],
  },
  {
    provide: Subscription,
    useFactory: (events: Events, projection: VendorStorefrontViewProjection) =>
      new InMemorySubscription(events, projection, new InMemoryCheckpoint('vendor-storefront-view')),
    inject: [Events, VendorStorefrontViewProjection],
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
];

@Module({
  imports: [CqrsModule],
  controllers: [VendorsController, StorefrontController],
  providers: [
    ...clock,
    ...messageContext,
    ...eventStore,
    ...repositories,
    ...readModel,
    ...commandHandlers,
    CommandDispatcher,
  ],
})
export class MarketDaysModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MessageContextMiddleware).forRoutes(VendorsController, StorefrontController);
  }
}
