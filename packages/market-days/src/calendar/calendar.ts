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

export class Calendar extends Aggregate {

  private _marketIds = new Map<string, string>();

  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered':
        this._marketIds.set(event.payload.scheduleId, event.payload.market.id);
        break;
      case 'MarketScheduleCancelled':
        this._marketIds.delete(event.payload.scheduleId);
        break;
    }
  }

  registerMarketSchedule(market: Market, schedule: Schedule): void {
    const { scheduleId, days, frequency, startDate } = schedule.snapshot();
    if (this.containsSchedule(scheduleId)) {
      throw new ScheduleAlreadyRegisteredError(`Schedule already registered with ID ${ scheduleId }`);
    }
    const event: MarketScheduleRegistered = {
      type: 'MarketScheduleRegistered',
      payload: {
        market: market.snapshot(),
        scheduleId,
        startDate,
        days,
        frequency
      },
      version: 1
    };
    this.raise(event);
  }

  amendMarketSchedule(market: Market, schedule: Schedule): void {
    const { scheduleId, days, frequency, startDate } = schedule.snapshot();
    if (!this.containsSchedule(scheduleId)) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId }`);
    }
    const marketSnapshot = market.snapshot();
    if (this._marketIds.get(scheduleId) !== marketSnapshot.id) {
      throw new ImmutableMarketError(`Cannot change the market of schedule ${ scheduleId }`);
    }
    const event: MarketScheduleAmended = {
      type: 'MarketScheduleAmended',
      payload: {
        market: marketSnapshot,
        scheduleId,
        startDate,
        days,
        frequency
      },
      version: 1
    };
    this.raise(event);
  }

  cancelMarketSchedule(scheduleId: ScheduleId): void {
    if (!this.containsSchedule(scheduleId.value())) {
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
    if (!this.containsSchedule(scheduleId.value())) {
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
    return this._marketIds.size > 0;
  }

  private containsSchedule(scheduleId: string): boolean {
    return this._marketIds.has(scheduleId);
  }
}
