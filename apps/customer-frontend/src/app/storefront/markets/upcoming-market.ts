import { CatalogueItem } from '../items/catalogue-item';

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
  // Started and not yet ended. The day survives until its end time so customers can read
  // the menu while they are standing at the market.
  inProgress: boolean;
  // The day's menu, joined to the catalogue by the query — empty when nothing is planned,
  // and always empty when the vendor is away.
  items: CatalogueItem[];
  // Which of those items sold out during service — suppressed with the menu when the
  // vendor is away, and may name an id the catalogue join dropped, which readers ignore.
  soldOutItemIds: string[];
};
