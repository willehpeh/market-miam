import { MarketDayView } from './market-days';

// The live screen's two banner states, read off the server-said occurrence — the clock
// never decides anything on the vendor's side (decisions 21, 27). Extracted so the
// waiting poll's gate is drivable without fake timers (decision 32b).

// Three of decision 56's five phases are today, either side of the market's hours. Every
// today-ness question in this app goes through here rather than reading the field.
export const isToday = (day: MarketDayView | undefined): boolean =>
  !!day && (day.phase === 'due' || day.phase === 'trading' || day.phase === 'over');

// The vendor's doorway gate (decision 27): a planned today is run from the live screen,
// anything else from the dashboard. The card reads it to choose its link, and the editor
// to choose where to put the vendor back — decision 10 gave it a second way in.
export const hasLiveScreen = (day: MarketDayView | undefined): boolean =>
  isToday(day) && !!day && day.itemIds.length > 0;

// True while the vendor can see a planned today whose market has not started: the state
// the pre-live banner names and the poll re-asks the server about, tick by tick.
export const awaitingStart = (day: MarketDayView | undefined): boolean =>
  hasLiveScreen(day) && day?.phase === 'due';

// Decision 26's live predicate in its slice-1 form — what the customer's page reads,
// which is exactly what the En direct receipt claims (decision 37). An empty menu
// broadcasts nothing, so being at the market is not enough.
export const broadcasting = (day: MarketDayView | undefined): boolean =>
  day?.phase === 'trading' && day.itemIds.length > 0;
