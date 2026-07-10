import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandGateway, EventStore, PostgresUnitOfWork } from '@market-miam/event-sourcing';
import { Clock, DateClock } from '@market-miam/common';
import {
  AddItemToCatalogueHandler,
  Calendars,
  Catalogues,
  CatalogueViewProjection,
  CatalogueViews,
  CatalogueViewStore,
  ChangeItemPriceHandler,
  EditStorefrontInformationHandler,
  FindVendorCatalogueHandler,
  FindVendorStorefrontHandler,
  InMemoryCatalogueViews,
  InMemoryVendorStorefrontViews,
  MarkItemAsSoldOutHandler,
  MarketDays,
  OpenStorefrontHandler,
  PlanItemsForMarketDayHandler,
  PostgresVendorStorefrontViews,
  RegisterMarketScheduleHandler,
  RegisterVendorHandler,
  RetireItemHandler,
  SetStorefrontCoverPhotoHandler,
  OpensStorefronts,
  PostgresCatalogueViews,
  Storefronts,
  UnplanItemFromMarketDayHandler,
  Vendors,
  VendorScopedEvents,
  VendorStorefrontViewProjection,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { SignedUploads, signedUploadsFor } from '../signed-uploads';
import { Persistence } from '../event-sourcing/event-sourcing.module';
import { VendorsController } from './vendors.controller';
import { StorefrontController } from './storefront.controller';
import { CatalogueController } from './catalogue.controller';
import { MarketScheduleController } from './market-schedule.controller';
import { VendorErasure } from './vendor-erasure';

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

const readModel = (persistence: Persistence): Provider[] => {
  const views: Provider[] =
    persistence === 'postgres'
      ? [
          {
            provide: PostgresVendorStorefrontViews,
            useFactory: (uow: PostgresUnitOfWork) => new PostgresVendorStorefrontViews(uow),
            inject: [PostgresUnitOfWork],
          },
          { provide: VendorStorefrontViews, useExisting: PostgresVendorStorefrontViews },
          { provide: VendorStorefrontViewStore, useExisting: PostgresVendorStorefrontViews },
          {
            provide: PostgresCatalogueViews,
            useFactory: (uow: PostgresUnitOfWork) => new PostgresCatalogueViews(uow),
            inject: [PostgresUnitOfWork],
          },
          { provide: CatalogueViews, useExisting: PostgresCatalogueViews },
          { provide: CatalogueViewStore, useExisting: PostgresCatalogueViews },
        ]
      : [
          InMemoryVendorStorefrontViews,
          { provide: VendorStorefrontViews, useExisting: InMemoryVendorStorefrontViews },
          { provide: VendorStorefrontViewStore, useExisting: InMemoryVendorStorefrontViews },
          InMemoryCatalogueViews,
          { provide: CatalogueViews, useExisting: InMemoryCatalogueViews },
          { provide: CatalogueViewStore, useExisting: InMemoryCatalogueViews },
        ];
  return [
    ...views,
    {
      provide: VendorStorefrontViewProjection,
      useFactory: (store: VendorStorefrontViewStore) => new VendorStorefrontViewProjection(store),
      inject: [VendorStorefrontViewStore],
    },
    {
      provide: CatalogueViewProjection,
      useFactory: (store: CatalogueViewStore) => new CatalogueViewProjection(store),
      inject: [CatalogueViewStore],
    },
  ];
};

const processors = [
  {
    provide: OpensStorefronts,
    useFactory: (gateway: CommandGateway) => new OpensStorefronts(gateway),
    inject: [CommandGateway],
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

const queryHandlers = [FindVendorStorefrontHandler, FindVendorCatalogueHandler];

// EventStore / CommandGateway / QueryGateway (and the pg UnitOfWork) come from
// the global EventSourcingModule.forRoot(...) at the composition root. persistence
// swaps only the read-model store: pg-backed views vs in-memory.
@Module({})
export class MarketDaysModule {
  static forRoot(persistence: Persistence): DynamicModule {
    return {
      module: MarketDaysModule,
      controllers: [VendorsController, StorefrontController, CatalogueController, MarketScheduleController],
      providers: [
        ...clock,
        ...signedUploads,
        ...repositories,
        ...readModel(persistence),
        ...processors,
        ...commandHandlers,
        ...queryHandlers,
        VendorErasure,
      ],
    };
  }
}
