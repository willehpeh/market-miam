import { Aggregate } from '@market-miam/event-sourcing';
import { LocalDate, LocalTime } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import {
  ItemOutcome,
  ItemOutcomeRecorded,
  MarketDayClosed,
  MarketDayEvent,
  MarketDayMenuSet,
  MarketDayReopened
} from './events';
import {
  ItemNotPlannedError,
  MarketDayClosedError,
  MarketDayEndedError,
  MarketDayInThePastError,
  MarketDayNotFinishedError,
  MarketDayNotTodayError
} from './errors';
import { MarketDayId } from './market-day-id';
import { ItemOutcomes } from './item-outcomes';
import { MarketHours } from './market-hours';
import { Menu } from './menu';
import { SoldOutItems } from './sold-out-items';
import { ItemId } from '../catalogue';

export class MarketDay extends Aggregate {

  private _menu = new Menu([]);
  private _soldOut = new SoldOutItems();
  private _outcomes = new ItemOutcomes();
  private _closed = false;

  // The hours come from the vendor's calendar, read by the repository — the day is
  // constituted with everything it decides on, without ever importing a schedule (ADR 0051).
  constructor(private readonly _id: MarketDayId,
              private readonly _today: LocalDate,
              private readonly _hours: MarketHours = new MarketHours()) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      // Everything keyed by item is pruned to the new menu. A dish taken off and put back
      // must come back blank, or the no-op guards below swallow the vendor's next tap on it
      // — the same defect in both collections, and in any third one added here.
      case 'MarketDayMenuSet':
        this._menu = new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId)));
        this._soldOut = this._soldOut.keptBy(this._menu);
        this._outcomes = this._outcomes.keptBy(this._menu);
        break;
      case 'ItemMarkedAsSoldOut':
        this._soldOut = this._soldOut.with(new ItemId(event.payload.itemId));
        break;
      case 'ItemOutcomeRecorded':
        this._outcomes = this._outcomes.with(new ItemId(event.payload.itemId), event.payload.outcome);
        break;
      case 'ItemMarkedAsAvailable':
        this._soldOut = this._soldOut.without(new ItemId(event.payload.itemId));
        break;
      case 'MarketDayClosed':
        this._closed = true;
        break;
      case 'MarketDayReopened':
        this._closed = false;
        // Decision 30: the day kept going, so every judgment made about it is stale. Same
        // shape as MarketDayMenuSet pruning sold-out above.
        this._outcomes = new ItemOutcomes();
        break;
    }
  }

  setMenu(menu: Menu) {
    if (this.inThePast()) {
      throw new MarketDayInThePastError();
    }
    if (this._closed) {
      throw new MarketDayClosedError();
    }
    if (menu.equals(this._menu)) {
      return;
    }
    const event: MarketDayMenuSet = {
      type: 'MarketDayMenuSet',
      payload: {
        itemIds: menu.value(),
        ...this._id.value()
      },
      version: 1
    };
    this.raise(event);
  }

  // Stricter than setMenu's past-only guard: planning ahead is legal, availability is a
  // claim about right now (LIVE-MODE-PLAN.md decision 16).
  markItemAsSoldOut(itemId: ItemId, time: LocalTime) {
    this.markAvailability(itemId, time, true);
  }

  markItemAsAvailable(itemId: ItemId, time: LocalTime) {
    this.markAvailability(itemId, time, false);
  }

  // Both directions, one set of guards: the pair drifted apart once already, when decision
  // 29's closed guard had to be added to each by hand. The no-op rule is one statement here
  // rather than two that must stay each other's negation — a re-statement of the current
  // state appends nothing, or a duplicate event would corrupt the availability timeline
  // (decision 36; same stance as setMenu unchanged).
  private markAvailability(itemId: ItemId, time: LocalTime, soldOut: boolean): void {
    if (this.notToday()) {
      throw new MarketDayNotTodayError();
    }
    if (this._closed) {
      throw new MarketDayClosedError();
    }
    if (!this._menu.includes(itemId)) {
      throw new ItemNotPlannedError();
    }
    if (this._soldOut.includes(itemId) === soldOut) {
      return;
    }
    const payload = { itemId: itemId.value(), ...this.stampedAt(time) };
    this.raise(soldOut
      ? { type: 'ItemMarkedAsSoldOut', payload, version: 1 }
      : { type: 'ItemMarkedAsAvailable', payload, version: 1 });
  }

  // The bilan (decision 64): what the vendor says about how a dish sold, once the day is
  // theirs to look back on.
  recordItemOutcome(itemId: ItemId, outcome: ItemOutcome, time: LocalTime) {
    if (!this.isFinished(time)) {
      throw new MarketDayNotFinishedError();
    }
    if (!this._menu.includes(itemId)) {
      throw new ItemNotPlannedError();
    }
    if (this._outcomes.alreadySay(itemId, outcome)) {
      return;
    }
    const event: ItemOutcomeRecorded = {
      type: 'ItemOutcomeRecorded',
      payload: { itemId: itemId.value(), outcome, ...this._id.value() },
      version: 1
    };
    this.raise(event);
  }

  streamIdFor(vendorId: VendorId): string {
    return this._id.streamIdFor(vendorId);
  }

  close(time: LocalTime) {
    if (this.notToday()) {
      throw new MarketDayNotTodayError();
    }
    if (this._closed) {
      return;
    }
    const event: MarketDayClosed = {
      type: 'MarketDayClosed',
      payload: this.stampedAt(time),
      version: 1
    };
    this.raise(event);
  }

  reopen(time: LocalTime) {
    if (this.notToday()) {
      throw new MarketDayNotTodayError();
    }
    if (this.hasEnded(time)) {
      throw new MarketDayEndedError();
    }
    if (!this._closed) {
      return;
    }
    const event: MarketDayReopened = {
      type: 'MarketDayReopened',
      payload: this.stampedAt(time),
      version: 1
    };
    this.raise(event);
  }

  // Which day, and when on it — the four timestamped events all carry exactly this, and
  // spelled out per event it drifted (decision 35 puts the clock on the server).
  private stampedAt(time: LocalTime): { marketId: string; date: string; time: string } {
    return { ...this._id.value(), time: time.value() };
  }

  private inThePast(): boolean {
    return this._id.isBefore(this._today);
  }

  private hasEnded(time: LocalTime): boolean {
    return time.isAfter(this._hours.closing());
  }

  // Decision 69: the stand is shut, the clock ran out, or the day is simply behind us. The
  // last clause is what lets the bilan outlive midnight — `hasEnded` compares a wall-clock
  // time against this day's closing, so without it Saturday's 14:30 market reads as still
  // running at 09:00 on Sunday. The only rule the domain keeps about staleness is none:
  // how far back a bilan is still offered is the query's to say, not the aggregate's.
  private isFinished(time: LocalTime): boolean {
    return this._closed || this.inThePast() || this.hasEnded(time);
  }

  private notToday(): boolean {
    return !this._id.isOn(this._today);
  }
}
