import { formatTime, longDate, timeRange } from '../core/french-date';
import { ItemOutcome, MarketDayView } from './market-days';

/**
 * One market on one date, as the server says it stands. Every question a screen asks of a
 * day is answered here, off the server-said phase and the facts the vendor set: the device
 * clock decides nothing on the vendor's side (decisions 21, 27).
 */
export class MarketDay {
  constructor(private readonly view: MarketDayView) {}

  marketId(): string {
    return this.view.marketId;
  }

  date(): string {
    return this.view.date;
  }

  // Both halves, always: two markets can share a date (decision 25).
  isOn(marketId: string, date: string): boolean {
    return this.view.marketId === marketId && this.view.date === date;
  }

  label(): string {
    return longDate(this.view.day, this.view.date);
  }

  marketName(): string {
    return this.view.market.name;
  }

  hours(): string {
    return timeRange(this.view);
  }

  opensAt(): string {
    return this.view.startTime ? formatTime(this.view.startTime) : '';
  }

  nextPhaseInMs(): number | undefined {
    return this.view.nextPhaseInMs;
  }

  isAbsent(): boolean {
    return this.view.absent;
  }

  isClosed(): boolean {
    return this.view.closed;
  }

  wasCalledOff(): boolean {
    return this.view.calledOff;
  }

  // Three of decision 56's five phases are today, either side of the market's hours.
  isToday(): boolean {
    return this.view.phase === 'due' || this.view.phase === 'trading' || this.view.phase === 'over';
  }

  isTrading(): boolean {
    return this.view.phase === 'trading';
  }

  isAfterHours(): boolean {
    return this.view.phase === 'over';
  }

  // The vendor's doorway (decision 27): a planned today is run from the live screen, and
  // anything else from the dashboard.
  hasLiveScreen(): boolean {
    return this.isToday() && this.hasMenu();
  }

  // What the pre-live banner names, and what the live screen's timer re-asks about.
  isAwaitingStart(): boolean {
    return this.hasLiveScreen() && this.view.phase === 'due';
  }

  // What the customer's page reads, and so what the En direct receipt claims (decisions
  // 26, 37): being at the market is not enough, since an empty menu broadcasts nothing.
  isBroadcasting(): boolean {
    return this.isTrading() && this.hasMenu();
  }

  // Closed, ended or past (decision 69), but never called off before it opened: that day
  // was never traded, so there is nothing to judge (decision 75).
  canBeJudged(): boolean {
    return !this.view.calledOff && (this.view.closed || this.view.phase === 'over' || this.view.phase === 'past');
  }

  // Shut by the vendor or ended by the clock, after which the rows stop being availability
  // controls (decision 48). Wider than canBeJudged: a called-off day is shut too, and the
  // aggregate refuses a mark on it.
  hasEnded(): boolean {
    return this.isClosed() || this.canBeJudged();
  }

  menuItemIds(): readonly string[] {
    return this.view.itemIds;
  }

  // In catalogue order. An id the catalogue has since retired drops out, as the API's own
  // readers ignore it.
  menuOf<Item extends { itemId: string }>(catalogue: readonly Item[]): Item[] {
    const onMenu = new Set(this.view.itemIds);
    return catalogue.filter((item) => onMenu.has(item.itemId));
  }

  isSoldOut(itemId: string): boolean {
    return this.view.soldOutItemIds.includes(itemId);
  }

  // The service log's sold-out marks, under the recorded bilan, which outranks them: a vendor
  // who already overrode a mark should not meet it again on a second visit (decisions 49, 72).
  outcomesSoFar(): Record<string, ItemOutcome> {
    const soldOut = Object.fromEntries(
      this.view.soldOutItemIds.map((itemId): [string, ItemOutcome] => [itemId, 'sold_out']),
    );
    return { ...soldOut, ...this.view.outcomes };
  }

  withMenu(itemIds: string[]): MarketDay {
    return new MarketDay({ ...this.view, itemIds });
  }

  withAvailability(itemId: string, { soldOut }: { soldOut: boolean }): MarketDay {
    const others = this.view.soldOutItemIds.filter((id) => id !== itemId);
    return new MarketDay({ ...this.view, soldOutItemIds: soldOut ? [...others, itemId] : others });
  }

  withClosure({ closed }: { closed: boolean }): MarketDay {
    return new MarketDay({ ...this.view, closed });
  }

  withOutcomes(outcomes: Record<string, ItemOutcome>): MarketDay {
    return new MarketDay({ ...this.view, outcomes });
  }

  // The view back, for the store, which holds plain data.
  value(): MarketDayView {
    return this.view;
  }

  private hasMenu(): boolean {
    return this.view.itemIds.length > 0;
  }
}
