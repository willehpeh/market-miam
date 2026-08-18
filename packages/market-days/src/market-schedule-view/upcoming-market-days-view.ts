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
  // The occurrence falls on the server's today — true from midnight, before the market
  // starts, which inProgress deliberately is not. Same clock as the aggregate's today-guard,
  // so the screen this gates and the commands it fires can never disagree.
  today: boolean;
  // The day's menu joined from the catalogue at query time — current names and prices,
  // in catalogue order. Empty when nothing is planned; suppressed when absent.
  items: CatalogueViewItem[];
  // The vendor packed up (or never came). Independent of inProgress, which stays schedule
  // truth — a closed market is still *en cours* by the clock (decision 13).
  closed: boolean;
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
