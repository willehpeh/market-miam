import {
  AbsenceDeclared,
  MarketPricesSet,
  MarketScheduleAmended,
  MarketScheduleCancelled,
  MarketScheduleRegistered,
} from '@market-miam/market-days';

// The events a calendar spec seeds as its Given, typed against the domain's event types
// (see market-day-events.ts for the stance). Defaults match TestRegisterMarketSchedule.simple():
// vendor-id, schedule-id at market-id on Saturdays 08:00–14:00 from 2023-09-08, weekly.
// Seed them on `calendarStream(vendorId)`.
export const calendarStream = (vendorId = 'vendor-id'): string => `calendar-${vendorId}`;

type Schedule = MarketScheduleRegistered['payload'];

const schedule = (overrides: Partial<Schedule>): Schedule => ({
  scheduleId: 'schedule-id',
  startDate: '2023-09-08',
  market: { id: 'market-id', name: 'Belleville Market', streetAddress: '20 rue du Marché', codePostal: '75020', town: 'Paris', pitch: 'Stall 42' },
  days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
  frequency: { weeks: 1 },
  ...overrides,
});

export const scheduleRegistered = (overrides: Partial<Schedule> = {}): MarketScheduleRegistered =>
  ({ type: 'MarketScheduleRegistered', payload: schedule(overrides), version: 1 });

export const scheduleAmended = (overrides: Partial<Schedule> = {}): MarketScheduleAmended =>
  ({ type: 'MarketScheduleAmended', payload: schedule(overrides), version: 1 });

export const scheduleCancelled = (scheduleId = 'schedule-id'): MarketScheduleCancelled =>
  ({ type: 'MarketScheduleCancelled', payload: { scheduleId }, version: 1 });

export const absenceDeclared = (from: string, to: string, scheduleId = 'schedule-id'): AbsenceDeclared =>
  ({ type: 'AbsenceDeclared', payload: { scheduleId, from, to }, version: 1 });

export const marketPricesSet = (prices: MarketPricesSet['payload']['prices'], marketId = 'market-id'): MarketPricesSet =>
  ({ type: 'MarketPricesSet', payload: { marketId, prices }, version: 1 });
