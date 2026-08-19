import { Aggregate } from '@market-miam/event-sourcing';
import { LocalDate, LocalTime } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import {
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
  MarketDayNotTodayError
} from './errors';
import { MarketDayId } from './market-day-id';
import { Menu } from './menu';
import { SoldOutItems } from './sold-out-items';
import { ItemId } from '../catalogue';

// The only part of the day's schedule the aggregate decides with. Structural, so the
// calendar's Occurrence satisfies it without the market day importing the calendar.
type MarketHours = { endTime?: string };

export class MarketDay extends Aggregate {

  private _menu = new Menu([]);
  private _soldOut = new SoldOutItems();
  private _closed = false;

  constructor(private readonly _id: MarketDayId,
              private readonly _today: LocalDate,
              private readonly _hours?: MarketHours) {
    super();
  }

  apply(event: MarketDayEvent): void {
    switch (event.type) {
      case 'MarketDayMenuSet':
        this._menu = new Menu(event.payload.itemIds.map(itemId => new ItemId(itemId)));
        this._soldOut = this._soldOut.keptBy(this._menu);
        break;
      case 'ItemMarkedAsSoldOut':
        this._soldOut = this._soldOut.with(new ItemId(event.payload.itemId));
        break;
      case 'ItemMarkedAsAvailable':
        this._soldOut = this._soldOut.without(new ItemId(event.payload.itemId));
        break;
      case 'MarketDayClosed':
        this._closed = true;
        break;
      case 'MarketDayReopened':
        this._closed = false;
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
        ...this._id.snapshot()
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
    const payload = { itemId: itemId.value(), ...this._id.snapshot(), time: time.value() };
    this.raise(soldOut
      ? { type: 'ItemMarkedAsSoldOut', payload, version: 1 }
      : { type: 'ItemMarkedAsAvailable', payload, version: 1 });
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
      payload: {
        ...this._id.snapshot(),
        time: time.value()
      },
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
      payload: {
        ...this._id.snapshot(),
        time: time.value()
      },
      version: 1
    };
    this.raise(event);
  }

  private inThePast(): boolean {
    return this._id.isBefore(this._today);
  }

  // A day no schedule covers, or one with no closing time, runs to the end of the calendar
  // day — the same fallback the query side reads it with (market-day-clock.ts).
  private hasEnded(time: LocalTime): boolean {
    return time.isAfter(new LocalTime(this._hours?.endTime ?? '23:59'));
  }

  private notToday(): boolean {
    return !this._id.isOn(this._today);
  }
}
