import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { TestRegisterMarketSchedule } from './test-data';
import {
  Calendars,
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
    TestRegisterMarketSchedule.simpleMonthly()
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
