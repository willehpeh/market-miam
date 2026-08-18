import {
  AbsenceDeclared,
  CalendarEvent,
  MarketScheduleAmended,
  MarketScheduleCancelled,
  MarketScheduleRegistered
} from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { Schedule } from './schedule/schedule';
import { ScheduleId } from './schedule/schedule-id';
import { DateRange } from './date-range';
import { ImmutableMarketError, NoSuchScheduleError, ScheduleAlreadyRegisteredError } from './errors';
import { Market } from '../market';
import { LocalDate } from '@market-miam/common';
import { Occurrence, Recurrence, RecurrenceSnapshot } from './schedule/recurrence';

type ScheduledMarket = { marketId: string; recurrence: RecurrenceSnapshot };

export class Calendar extends Aggregate {

  private _schedules = new Map<string, ScheduledMarket>();

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
    }
  }

  registerMarketSchedule(market: Market, schedule: Schedule): void {
    const { days, frequency, startDate } = schedule.snapshot();
    const scheduleId = schedule.id();
    if (this.containsSchedule(scheduleId)) {
      throw new ScheduleAlreadyRegisteredError(`Schedule already registered with ID ${ scheduleId.value() }`);
    }
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        market: market.snapshot(),
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
    const { days, frequency, startDate } = schedule.snapshot();
    const scheduleId = schedule.id();
    if (!this.containsSchedule(scheduleId)) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId.value() }`);
    }
    const marketSnapshot = market.snapshot();
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

  hasAtLeastOneSchedule(): boolean {
    return this._schedules.size > 0;
  }

  // The hours a market day runs to, expanded from the recurrence for that one date. A day
  // no schedule covers has none — the write path stays as incurious about unreal days as
  // it has always been, and the caller falls back to the end of the calendar day.
  hoursFor(marketId: string, date: LocalDate): Occurrence | undefined {
    return [...this._schedules.values()]
      .filter(schedule => schedule.marketId === marketId)
      .flatMap(schedule => Recurrence.fromSnapshot(schedule.recurrence).occurrencesWithin(date, date))
      .at(0);
  }

  private containsSchedule(scheduleId: ScheduleId): boolean {
    return this._schedules.has(scheduleId.value());
  }
}
