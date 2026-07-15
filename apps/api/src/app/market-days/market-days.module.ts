import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandGateway, EventStore } from '@market-miam/event-sourcing';
import { Clock, DateClock } from '@market-miam/common';
import {
  AddItemToCatalogueHandler,
  AmendMarketScheduleHandler,
  CancelMarketScheduleHandler,
  Calendars,
  DeclareAbsenceHandler,
  Catalogues,
  CatalogueViewProjection,
  CatalogueViewStore,
  ChangeItemPriceHandler,
  ChangeItemPhotoHandler,
  EditStorefrontInformationHandler,
  FindCustomerStorefrontHandler,
  FindVendorCatalogueHandler,
  FindVendorStorefrontHandler,
  FindVendorSchedulesHandler,
  FindUpcomingMarketDaysHandler,
  MarketScheduleViewProjection,
  MarketScheduleViewStore,
  MarkItemAsSoldOutHandler,
  MarketDays,
  OpenStorefrontHandler,
  PlanItemsForMarketDayHandler,
  RegisterMarketScheduleHandler,
  RegisterVendorHandler,
  RetireItemHandler,
  ReviseItemHandler,
  SetStorefrontCoverPhotoHandler,
  OpensStorefronts,
  Storefronts,
  UnplanItemFromMarketDayHandler,
  Vendors,
  VendorScopedEvents,
  VendorStorefrontViewProjection,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { SignedUploads, signedUploadsFor } from '../signed-uploads';
import { VendorsController } from './vendors.controller';
import { StorefrontController } from './storefront.controller';
import { CatalogueController } from './catalogue.controller';
import { MarketScheduleController } from './market-schedule.controller';
import { PublicStorefrontController } from './public-storefront.controller';
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

// The view stores themselves are the profile's business (app/persistence/); these
// only need whichever *ViewStore answered.
const projections = [
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
  {
    provide: MarketScheduleViewProjection,
    useFactory: (store: MarketScheduleViewStore) => new MarketScheduleViewProjection(store),
    inject: [MarketScheduleViewStore],
  },
];

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
  ChangeItemPhotoHandler,
  RetireItemHandler,
  ReviseItemHandler,
  RegisterMarketScheduleHandler,
  AmendMarketScheduleHandler,
  CancelMarketScheduleHandler,
  DeclareAbsenceHandler,
  PlanItemsForMarketDayHandler,
  UnplanItemFromMarketDayHandler,
  MarkItemAsSoldOutHandler,
  EditStorefrontInformationHandler,
  SetStorefrontCoverPhotoHandler,
  OpenStorefrontHandler,
];

const queryHandlers = [FindCustomerStorefrontHandler, FindVendorStorefrontHandler, FindVendorCatalogueHandler, FindVendorSchedulesHandler, FindUpcomingMarketDaysHandler];

// EventStore / CommandGateway / QueryGateway come from the global
// EventSourcingModule; the view stores from the global persistence module the
// composition root picked. Nothing here knows which profile is running.
@Module({
  controllers: [VendorsController, StorefrontController, CatalogueController, MarketScheduleController, PublicStorefrontController],
  providers: [
    ...clock,
    ...signedUploads,
    ...repositories,
    ...projections,
    ...processors,
    ...commandHandlers,
    ...queryHandlers,
    VendorErasure,
  ],
})
export class MarketDaysModule {}
