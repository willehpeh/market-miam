import { CatalogueViewItem } from '../catalogue-view/catalogue-view';

export type MarketDayOccurrence = {
  scheduleId: string;
  marketId: string;
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
  absent: boolean;
  // The day's menu joined from the catalogue at query time — current names and prices,
  // in catalogue order. Empty when nothing is planned; suppressed when absent.
  dishes: CatalogueViewItem[];
  market: {
    name: string;
    town: string;
    codePostal: string;
    streetAddress?: string;
    pitch?: string;
  };
};

export type UpcomingMarketDaysView = {
  marketDays: MarketDayOccurrence[];
};
