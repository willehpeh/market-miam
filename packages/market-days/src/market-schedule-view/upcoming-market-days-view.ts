import { CatalogueViewItem } from '../catalogue-view/catalogue-view';

export type MarketDayOccurrence = {
  scheduleId: string;
  marketId: string;
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
  absent: boolean;
  // The market is happening right now — schedule truth, never true for an absent day.
  inProgress: boolean;
  // The day's menu joined from the catalogue at query time — current names and prices,
  // in catalogue order. Empty when nothing is planned; suppressed when absent.
  items: CatalogueViewItem[];
  // Which of those items sold out during service. Suppressed with the menu when absent;
  // may name an id the catalogue join dropped (a retired item), which readers ignore.
  soldOutItemIds: string[];
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
