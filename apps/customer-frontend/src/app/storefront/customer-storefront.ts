import { UpcomingMarket } from './markets/upcoming-market';
import { CatalogueItem } from './items/catalogue-item';

export type CustomerStorefront = PublishedCustomerStorefront | ComingSoonCustomerStorefront;

export type PublishedCustomerStorefront = {
  status: 'published';
  name: string;
  description: string;
  phone: string;
  coverPhoto: string | null;
  items: CatalogueItem[];
  // Whether the carte quotes its prices — the vendor's choice, opted in by default. Every
  // price is carried either way; this says only whether the carte draws them.
  cartePricesVisible: boolean;
  upcomingMarkets: UpcomingMarket[];
};

export type ComingSoonCustomerStorefront = {
  status: 'coming-soon';
  name: string | null;
};
