import { CatalogueViewItem } from '../catalogue-view/catalogue-view';

export type UpcomingMarket = {
  date: string;
  weekday: string;
  marketName: string;
  startTime?: string;
  endTime?: string;
  street?: string;
  postalCode: string;
  town: string;
  pitch?: string;
  cancelled: boolean;
};

export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
      dishes: CatalogueViewItem[];
      upcomingMarkets: UpcomingMarket[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
