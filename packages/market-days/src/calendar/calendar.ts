import { CalendarEvent, MarketScheduleRegistered, MarketScheduleCancelled, MarketScheduleAmended, AbsenceDeclared } from './events';
import { Aggregate } from '@market-miam/event-sourcing';
import { Schedule } from './schedule/schedule';
import { ScheduleId } from './schedule/schedule-id';
import { DateRange } from './date-range';
import { NoSuchScheduleError } from './errors/no-such-schedule.error';
import { ScheduleAlreadyRegisteredError } from './errors/schedule-already-registered.error';
import { Market } from '../market';

export class Calendar extends Aggregate {

  private _scheduleIds: string[] = [];

  apply(event: CalendarEvent): void {
    switch (event.type) {
      case 'MarketScheduleRegistered':
        this._scheduleIds.push(event.payload.scheduleId);
        break;
      case 'MarketScheduleCancelled':
        this._scheduleIds = this._scheduleIds.filter(id => id !== event.payload.scheduleId);
        break;
    }
  }

  registerMarketSchedule(market: Market, schedule: Schedule): void {
    const { scheduleId, days, frequency, startDate } = schedule.snapshot();
    if (this.hasSchedule(scheduleId)) {
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
    if (!this.hasSchedule(scheduleId)) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId }`);
    }
    const event: MarketScheduleAmended = {
      type: 'MarketScheduleAmended',
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

  cancelMarketSchedule(scheduleId: ScheduleId): void {
    if (!this.hasSchedule(scheduleId.value())) {
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
    if (!this.hasSchedule(scheduleId.value())) {
      throw new NoSuchScheduleError(`No schedule with ID ${ scheduleId.value() }`);
    }
    const event: AbsenceDeclared = {
      type: 'AbsenceDeclared',
      payload: { scheduleId: scheduleId.value(), ...range.value() },
      version: 1
    };
    this.raise(event);
  }

  private hasSchedule(scheduleId: string): boolean {
    return this._scheduleIds.includes(scheduleId);
  }
}
