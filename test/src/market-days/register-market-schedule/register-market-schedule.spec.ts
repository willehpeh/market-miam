import { InMemoryEventStore } from '../../in-memory.event-store';
import { TestRegisterMarketSchedule } from './test-data';
import {
  Calendars,
  ConflictingScheduleError,
  InvalidScheduleError,
  RegisterMarketScheduleHandler
} from '@market-monster/market-days';
import { EmptyValueError } from '@market-monster/common';

describe('Register Market Schedule', () => {
  let store: InMemoryEventStore;
  let handler: RegisterMarketScheduleHandler;
  let calendars: Calendars;

  beforeEach(() => {
    store = new InMemoryEventStore();
    calendars = new Calendars(store);
    handler = new RegisterMarketScheduleHandler(calendars);
  });

  it.each([
    TestRegisterMarketSchedule.simple(),
    TestRegisterMarketSchedule.everyDay()
  ])('should register a market schedule, defaulting to weekly', async request => {
    await handler.handle(request);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        scheduleId: expect.any(String),
        scheduleName: request.scheduleName,
        marketId: request.marketId,
        days: request.days,
        every: {
          weeks: 1
        }
      })
    })]);
  });

  it.each([
    ' ',
    ''
  ])('should not allow a schedule with an empty name', async scheduleName => {
    const request = TestRegisterMarketSchedule.with({ scheduleName });
    await expect(handler.handle(request)).rejects.toThrow(EmptyValueError);
  });

  it('should allow non-overlapping times on the same day', async () => {
    const request = TestRegisterMarketSchedule.with({
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '12:00' },
        { day: 'SAT', startTime: '14:00', endTime: '18:00' },
      ]
    });
    await handler.handle(request);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        days: request.days,
      }),
    })]);
  });

  it.each([
    {
      scenario: 'identical whole-day entries',
      days: [{ day: 'WED' }, { day: 'WED' }],
    },
    {
      scenario: 'whole-day entry overlaps a timed entry',
      days: [{ day: 'SAT' }, { day: 'SAT', startTime: '08:00', endTime: '12:00' }],
    },
    {
      scenario: 'identical time ranges',
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
      ],
    },
    {
      scenario: 'partially overlapping time ranges',
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
        { day: 'SAT', startTime: '12:00', endTime: '18:00' },
      ],
    },
  ])('should reject overlapping schedule: $scenario', async ({ days }) => {
    const request = TestRegisterMarketSchedule.with({ days });
    await expect(handler.handle(request)).rejects.toThrow(ConflictingScheduleError);
  });

  it('should reject a schedule that conflicts with a previously registered one', async () => {
    await handler.handle(TestRegisterMarketSchedule.with({
      scheduleName: 'Saturday Morning Market',
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }]
    }));

    const conflicting = TestRegisterMarketSchedule.with({
      scheduleName: 'Saturday Afternoon Market',
      days: [{ day: 'SAT', startTime: '10:00', endTime: '16:00' }]
    });
    await expect(handler.handle(conflicting)).rejects.toThrow(ConflictingScheduleError);
  });

  it('should reject a schedule with no days', async () => {
    const request = TestRegisterMarketSchedule.with({ days: [] });
    await expect(handler.handle(request)).rejects.toThrow(InvalidScheduleError);
  });

  it('should reject a schedule with even a single invalid day name', async () => {
    const request = TestRegisterMarketSchedule.with({ days: [{ day: 'MON' }, { day: 'INVALID' }] });
    await expect(handler.handle(request)).rejects.toThrow(InvalidScheduleError);
  });

  it('should reject a schedule where even a single day has an end time that is not after start time', async () => {
    const request = TestRegisterMarketSchedule.with({ days: [{ day: 'SAT', startTime: '14:00', endTime: '12:00' }] });
    await expect(handler.handle(request)).rejects.toThrow(InvalidScheduleError);
  });
});

