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
  upcomingMarkets: UpcomingMarket[];
};

export type ComingSoonCustomerStorefront = {
  status: 'coming-soon';
  name: string | null;
};
