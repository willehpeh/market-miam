import {
  AbsenceDeclared,
  CalendarEvent,
  MarketPricesSet,
  MarketScheduleAmended,
  MarketScheduleCancelled,
  MarketScheduleRegistered
} from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { Schedule } from './schedule/schedule';
import { ScheduleId } from './schedule/schedule-id';
import { DateRange } from './date-range';
import { ImmutableMarketError, NoSuchScheduleError, ScheduleAlreadyRegisteredError, UnscheduledMarketError } from './errors';
import { Market } from '../market';
import { LocalDate } from '@market-miam/common';
import { Occurrence, Recurrence, RecurrenceSnapshot } from './schedule/recurrence';
import { MarketPrices } from './pricing/market-prices';

type ScheduledMarket = { marketId: string; recurrence: RecurrenceSnapshot };

export class Calendar extends Aggregate {

  private _schedules = new Map<string, ScheduledMarket>();
  private _prices = new Map<string, MarketPrices>();

  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered':
      case 'MarketScheduleAmended':
        this._schedules.set(event.payload.scheduleId, {
          marketId: event.payload.market.id,
          recurrence: { startDate: event.payload.startDate, days: event.payload.days, frequency: event.payload.frequency },
        });
        break;
      case 'MarketScheduleCancelled':
        this._schedules.delete(event.payload.scheduleId);
        break;
      case 'MarketPricesSet':
        this._prices.set(event.payload.marketId, new MarketPrices(event.payload.prices));
        break;
    }
  }

  registerMarketSchedule(market: Market, schedule: Schedule): void {
    const { days, frequency, startDate } = schedule.value();
    const scheduleId = schedule.id();
    if (this.containsSchedule(scheduleId)) {
      throw new ScheduleAlreadyRegisteredError(`Schedule already registered with ID ${ scheduleId.value() }`);
    }
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        market: market.value(),
        scheduleId: scheduleId.value(),
        startDate,
        days,
        frequency
      },
      version: 1
    };
    this.raise(event);
  }

  amendMarketSchedule(market: Market, schedule: Schedule): void {
    const { days, frequency, startDate } = schedule.value();
    const scheduleId = schedule.id();
    if (!this.containsSchedule(scheduleId)) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId.value() }`);
    }
    const marketSnapshot = market.value();
    if (this._schedules.get(scheduleId.value())?.marketId !== marketSnapshot.id) {
      throw new ImmutableMarketError(`Cannot change the market of schedule ${ scheduleId.value() }`);
    }
    const event: MarketScheduleAmended = {
      type: 'MarketScheduleAmended',
      payload: {
        market: marketSnapshot,
        scheduleId: scheduleId.value(),
        startDate,
        days,
        frequency
      },
      version: 1
    };
    this.raise(event);
  }

  cancelMarketSchedule(scheduleId: ScheduleId): void {
    if (!this.containsSchedule(scheduleId)) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId.value() }`);
    }
    const event: MarketScheduleCancelled = {
      type: 'MarketScheduleCancelled',
      payload: { scheduleId: scheduleId.value() },
      version: 1
    };
    this.raise(event);
  }

  declareAbsence(scheduleId: ScheduleId, range: DateRange): void {
    if (!this.containsSchedule(scheduleId)) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId.value() }`);
    }
    const event: AbsenceDeclared = {
      type: 'AbsenceDeclared',
      payload: { scheduleId: scheduleId.value(), ...range.value() },
      version: 1
    };
    this.raise(event);
  }

  setMarketPrices(marketId: string, prices: MarketPrices): void {
    if (!this.schedulesMarket(marketId)) {
      throw new UnscheduledMarketError(`No schedule at market ${ marketId }`);
    }
    if (this.pricesAt(marketId).equals(prices)) {
      return;
    }
    const event: MarketPricesSet = {
      type: 'MarketPricesSet',
      payload: { marketId, prices: prices.value() },
      version: 1
    };
    this.raise(event);
  }

  hasAtLeastOneSchedule(): boolean {
    return this._schedules.size > 0;
  }

  // The hours a market day runs to, expanded from the recurrence for that one date. A day
  // no schedule covers has none — the write path stays as incurious about unreal days as
  // it has always been, and the caller falls back to the end of the calendar day.
  hoursFor(marketId: string, date: LocalDate): Occurrence | undefined {
    return this.schedulesAt(marketId)
      .flatMap(schedule => Recurrence.fromSnapshot(schedule.recurrence).occurrencesWithin(date, date))
      .at(0);
  }

  private schedulesAt(marketId: string): ScheduledMarket[] {
    return [...this._schedules.values()].filter(schedule => schedule.marketId === marketId);
  }

  private schedulesMarket(marketId: string): boolean {
    return this.schedulesAt(marketId).length > 0;
  }

  private pricesAt(marketId: string): MarketPrices {
    return this._prices.get(marketId) ?? new MarketPrices();
  }

  private containsSchedule(scheduleId: ScheduleId): boolean {
    return this._schedules.has(scheduleId.value());
  }
}
