import { CatalogueDish } from '../dishes/catalogue-dish';

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
  dishes: CatalogueDish[];
};
