import { UpcomingMarket } from './markets/upcoming-market';
import { CatalogueDish } from './dishes/catalogue-dish';

export type CustomerStorefront = PublishedCustomerStorefront | ComingSoonCustomerStorefront;

export type PublishedCustomerStorefront = {
  status: 'published';
  name: string;
  description: string;
  phone: string;
  coverPhoto: string | null;
  dishes: CatalogueDish[];
  upcomingMarkets: UpcomingMarket[];
};

export type ComingSoonCustomerStorefront = {
  status: 'coming-soon';
  name: string | null;
};
