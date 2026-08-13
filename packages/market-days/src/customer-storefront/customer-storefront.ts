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
  // The market is happening right now — the "En cours" badge. Never true for a
  // cancelled day.
  inProgress: boolean;
  // The day's menu, joined from the catalogue upstream; empty when nothing is planned
  // or the day is cancelled.
  items: CatalogueViewItem[];
};

export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
      items: CatalogueViewItem[];
      upcomingMarkets: UpcomingMarket[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
