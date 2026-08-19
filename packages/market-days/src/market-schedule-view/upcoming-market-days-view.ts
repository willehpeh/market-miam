import { CatalogueViewItem } from '../catalogue-view/catalogue-view';
import { MarketDayPhase } from './market-day-clock';

export type MarketDayOccurrence = {
  scheduleId: string;
  marketId: string;
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
  absent: boolean;
  // Where now sits against this day, by the clock alone (decision 56): `due`, `trading` and
  // `over` all mean today, either side of the market's hours; `future` and `past` are the
  // dates around it. Same clock as the aggregate's today-guard, so the screens this gates
  // and the commands they fire can never disagree. Nothing the vendor does moves it —
  // `closed` and `absent` below are the facts they can set, and both are independent of it.
  phase: MarketDayPhase;
  // How long this phase has left, so a screen can schedule one re-ask instead of polling.
  // Present for the three today phases only: `past` has no phase after it, and a `future`
  // day's boundary is days away, which no timer wants (decision 61).
  nextPhaseInMs?: number;
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
