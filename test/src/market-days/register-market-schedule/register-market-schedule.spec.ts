import { InMemoryEventStore } from '@market-monster/event-sourcing';
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
    TestRegisterMarketSchedule.simpleNoTimes(),
    TestRegisterMarketSchedule.everyDay(),
    TestRegisterMarketSchedule.simpleMonthly(),
    TestRegisterMarketSchedule.with({
      days: [
        { day: 'MON', startTime: '09:00', endTime: '14:00' },
        { day: 'MON', startTime: '14:00', endTime: '20:00' }
      ]
    })
  ])('should register a market schedule, defaulting to weekly', async command => {
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        scheduleId: expect.any(String),
        scheduleName: command.scheduleName,
        startDate: command.startDate,
        marketId: command.marketId,
        days: command.days,
        frequency: command.frequency ?? { weeks: 1 }
      })
    })]);
  });

  it.each([
    ' ',
    ''
  ])('should not allow a schedule with an empty name', async scheduleName => {
    const command = TestRegisterMarketSchedule.with({ scheduleName });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it.each([
    ' ',
    ''
  ])('should not allow a schedule with an empty id', async scheduleId => {
    const command = TestRegisterMarketSchedule.with({ scheduleId });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it('should allow non-overlapping times on the same day', async () => {
    const command = TestRegisterMarketSchedule.with({
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '12:00' },
        { day: 'SAT', startTime: '14:00', endTime: '18:00' }
      ]
    });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        days: command.days
      })
    })]);
  });

  it('should allow adjacent times when the later range is listed before the earlier one', async () => {
    const command = TestRegisterMarketSchedule.with({
      days: [
        { day: 'SAT', startTime: '14:00', endTime: '20:00' },
        { day: 'SAT', startTime: '08:00', endTime: '14:00' }
      ]
    });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        days: command.days
      })
    })]);
  });

  it('should allow a day with a start time but no end time', async () => {
    const command = TestRegisterMarketSchedule.with({ days: [{ day: 'SAT', startTime: '08:00' }] });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        days: command.days
      })
    })]);
  });

  it.each([
    {
      scenario: 'identical whole-day entries',
      days: [{ day: 'WED' }, { day: 'WED' }]
    },
    {
      scenario: 'whole-day entry overlaps a timed entry',
      days: [{ day: 'SAT' }, { day: 'SAT', startTime: '08:00', endTime: '12:00' }]
    },
    {
      scenario: 'identical time ranges',
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
        { day: 'SAT', startTime: '08:00', endTime: '14:00' }
      ]
    },
    {
      scenario: 'partially overlapping time ranges',
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
        { day: 'SAT', startTime: '12:00', endTime: '18:00' }
      ]
    }
  ])('should reject overlapping schedule: $scenario', async ({ days }) => {
    const command = TestRegisterMarketSchedule.with({ days });
    await expect(handler.execute(command)).rejects.toThrow(ConflictingScheduleError);
  });

  it('should reject a schedule that conflicts with a previously registered one', async () => {
    await handler.execute(TestRegisterMarketSchedule.with({
      scheduleName: 'Saturday Morning Market',
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }]
    }));

    const conflicting = TestRegisterMarketSchedule.with({
      scheduleName: 'Saturday Afternoon Market',
      days: [{ day: 'SAT', startTime: '10:00', endTime: '16:00' }]
    });
    await expect(handler.execute(conflicting)).rejects.toThrow(ConflictingScheduleError);
  });

  it('should allow two start-only days on the same day across markets', async () => {
    await handler.execute(TestRegisterMarketSchedule.with({
      scheduleId: 'morning',
      marketId: 'market-a',
      scheduleName: 'Morning Market',
      days: [{ day: 'SAT', startTime: '09:00' }]
    }));

    const afternoon = TestRegisterMarketSchedule.with({
      scheduleId: 'afternoon',
      marketId: 'market-b',
      scheduleName: 'Afternoon Market',
      days: [{ day: 'SAT', startTime: '14:00' }]
    });
    await handler.execute(afternoon);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketScheduleRegistered',
        payload: expect.objectContaining({ scheduleName: 'Morning Market' })
      }),
      expect.objectContaining({
        type: 'MarketScheduleRegistered',
        payload: expect.objectContaining({ scheduleName: 'Afternoon Market' })
      })
    ]);
  });

  it('should allow a start-only day registered before a timed day on the same day across markets', async () => {
    await handler.execute(TestRegisterMarketSchedule.with({
      scheduleId: 'open-ended',
      marketId: 'market-a',
      scheduleName: 'Open-ended Market',
      days: [{ day: 'SAT', startTime: '09:00' }]
    }));

    const timed = TestRegisterMarketSchedule.with({
      scheduleId: 'timed',
      marketId: 'market-b',
      scheduleName: 'Timed Market',
      days: [{ day: 'SAT', startTime: '10:00', endTime: '12:00' }]
    });
    await handler.execute(timed);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketScheduleRegistered',
        payload: expect.objectContaining({ scheduleName: 'Open-ended Market' })
      }),
      expect.objectContaining({
        type: 'MarketScheduleRegistered',
        payload: expect.objectContaining({ scheduleName: 'Timed Market' })
      })
    ]);
  });

  it('should allow a start-only day registered after a timed day on the same day across markets', async () => {
    await handler.execute(TestRegisterMarketSchedule.with({
      scheduleId: 'timed',
      marketId: 'market-a',
      scheduleName: 'Timed Market',
      days: [{ day: 'SAT', startTime: '10:00', endTime: '12:00' }]
    }));

    const openEnded = TestRegisterMarketSchedule.with({
      scheduleId: 'open-ended',
      marketId: 'market-b',
      scheduleName: 'Open-ended Market',
      days: [{ day: 'SAT', startTime: '09:00' }]
    });
    await handler.execute(openEnded);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'MarketScheduleRegistered',
        payload: expect.objectContaining({ scheduleName: 'Timed Market' })
      }),
      expect.objectContaining({
        type: 'MarketScheduleRegistered',
        payload: expect.objectContaining({ scheduleName: 'Open-ended Market' })
      })
    ]);
  });

  it('should reject a start-only day that conflicts with a previously registered whole-day', async () => {
    await handler.execute(TestRegisterMarketSchedule.with({
      scheduleId: 'all-day',
      marketId: 'market-a',
      scheduleName: 'All-day Market',
      days: [{ day: 'SAT' }]
    }));

    const startOnly = TestRegisterMarketSchedule.with({
      scheduleId: 'open-ended',
      marketId: 'market-b',
      scheduleName: 'Open-ended Market',
      days: [{ day: 'SAT', startTime: '09:00' }]
    });
    await expect(handler.execute(startOnly)).rejects.toThrow(ConflictingScheduleError);
  });

  it('should reject a whole-day that conflicts with a previously registered start-only day', async () => {
    await handler.execute(TestRegisterMarketSchedule.with({
      scheduleId: 'open-ended',
      marketId: 'market-a',
      scheduleName: 'Open-ended Market',
      days: [{ day: 'SAT', startTime: '09:00' }]
    }));

    const wholeDay = TestRegisterMarketSchedule.with({
      scheduleId: 'all-day',
      marketId: 'market-b',
      scheduleName: 'All-day Market',
      days: [{ day: 'SAT' }]
    });
    await expect(handler.execute(wholeDay)).rejects.toThrow(ConflictingScheduleError);
  });

  it('should reject a schedule with no days', async () => {
    const command = TestRegisterMarketSchedule.with({ days: [] });
    await expect(handler.execute(command)).rejects.toThrow(InvalidScheduleError);
  });

  it('should reject a schedule with even a single invalid day name', async () => {
    const command = TestRegisterMarketSchedule.with({ days: [{ day: 'MON' }, { day: 'INVALID' }] });
    await expect(handler.execute(command)).rejects.toThrow(InvalidScheduleError);
  });

  it('should reject a day with an end time but no start time', async () => {
    const command = TestRegisterMarketSchedule.with({ days: [{ day: 'SAT', endTime: '14:00' }] });
    await expect(handler.execute(command)).rejects.toThrow(InvalidScheduleError);
  });

  it('should reject a schedule where even a single day has an end time that is not after start time', async () => {
    const command = TestRegisterMarketSchedule.with({ days: [{ day: 'SAT', startTime: '14:00', endTime: '12:00' }] });
    await expect(handler.execute(command)).rejects.toThrow(InvalidScheduleError);
  });

  it('should reject a schedule containing a day where start and end time are the same', async () => {
    const command = TestRegisterMarketSchedule.with({ days: [{ day: 'MON', startTime: '14:00', endTime: '14:00' }] });
    await expect(handler.execute(command)).rejects.toThrow(InvalidScheduleError);
  })

  it.each([
    [0], [-1]
  ])('should reject a schedule with %s weeks frequency', async (weeks) => {
    const command = TestRegisterMarketSchedule.with({ frequency: { weeks } });
    await expect(handler.execute(command)).rejects.toThrow(InvalidScheduleError);
  });
});

