import { randomUUID } from 'node:crypto';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  EventStore,
  InMemoryEventStore,
  MessageContext,
  MessageContextDispatcher,
  MessageContextEventStore,
} from '@market-monster/event-sourcing';
import { Clock, DateClock } from '@market-monster/common';
import {
  AddItemToCatalogueHandler,
  Calendars,
  Catalogues,
  ChangeItemPriceHandler,
  EditStorefrontInformationHandler,
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
} from '@market-monster/market-days';
import { MessageContextMiddleware } from './message-context.middleware';
import { VendorsController } from './vendors.controller';

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
    provide: EventStore,
    useFactory: (inner: InMemoryEventStore, context: MessageContext) =>
      new MessageContextEventStore(inner, context),
    inject: [InMemoryEventStore, MessageContext],
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
  controllers: [VendorsController],
  providers: [
    ...clock,
    ...messageContext,
    ...eventStore,
    ...repositories,
    ...commandHandlers,
  ],
})
export class MarketDaysModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MessageContextMiddleware).forRoutes(VendorsController);
  }
}
