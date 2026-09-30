import { DomainEvent, EventOfType } from '@market-miam/event-sourcing';
import { CalendarEvent } from '../calendar/events';
import { CatalogueEvent } from '../catalogue/events';
import { MarketDayEvent } from '../market-day';
import { StorefrontEvent } from '../storefront/events';
import { VendorEvent } from './events';

type MarketDaysEvent = VendorEvent | StorefrontEvent | CatalogueEvent | CalendarEvent | MarketDayEvent;

type PiiFieldsOf<E extends DomainEvent> = {
  [K in E['type']]: (keyof EventOfType<E, K>['payload'] & string)[];
};

/** The registry of which event payload fields hold PII, encrypted at rest and
 * crypto-shredded on erasure.
 */
export const vendorPiiFields: PiiFieldsOf<MarketDaysEvent> = {
  VendorRegistered: ['email'],
  StorefrontInformationEdited: ['name', 'description', 'phone'],
  StorefrontOpened: [],
  StorefrontCoverPhotoSet: [],
  StorefrontPublished: [],
  CartePricesHidden: [],
  CartePricesShown: [],
  ItemAddedToCatalogue: [],
  ItemRetired: [],
  ItemRevised: [],
  ItemPhotoChanged: [],
  ItemsReordered: [],
  MarketScheduleRegistered: [],
  MarketScheduleCancelled: [],
  MarketScheduleAmended: [],
  AbsenceDeclared: [],
  MarketPricesSet: [],
  MarketDayMenuSet: [],
  ItemMarkedAsSoldOut: [],
  ItemMarkedAsAvailable: [],
  MarketDayBilanRecorded: [],
  MarketDayClosed: [],
  MarketDayReopened: [],
};
