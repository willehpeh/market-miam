import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { VendorScopedEvents } from '@market-miam/market-days';
import { TestRegisterMarketSchedule } from './test-data';
import {
  Calendars,
  InvalidScheduleError,
  RegisterMarketScheduleHandler,
  ScheduleAlreadyRegisteredError
} from '@market-miam/market-days';
import { EmptyValueError } from '@market-miam/common';
import { InvalidPostalCodeError } from '@market-miam/market-days';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Register Market Schedule', () => {
  let store: InMemoryEventStore;
  let handler: RegisterMarketScheduleHandler;
  let calendars: Calendars;

  beforeEach(() => {
    store = new InMemoryEventStore();
    calendars = new Calendars(new VendorScopedEvents(store));
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
        startDate: command.startDate,
        market: command.market,
        days: command.days,
        frequency: command.frequency ?? { weeks: 1 }
      })
    })]);
  });

  it('omits the pitch when the market has none', async () => {
    const market = {
      id: 'market-id',
      name: 'Belleville Market',
      streetAddress: '20 rue du Marché',
      codePostal: '75020',
      town: 'Paris',
    };
    const command = TestRegisterMarketSchedule.with({ market });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({ market })
    })]);
  });

  it('allows a market with no street address', async () => {
    const market = {
      id: 'market-id',
      name: 'Belleville Market',
      codePostal: '75020',
      town: 'Paris',
      pitch: 'Stall 42',
    };
    const command = TestRegisterMarketSchedule.with({ market });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({ market })
    })]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await handler.execute(TestRegisterMarketSchedule.simple());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it.each([
    ' ',
    ''
  ])('should not allow a market with an empty name', async name => {
    const command = TestRegisterMarketSchedule.withMarket({ name });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it.each([
    ' ',
    ''
  ])('should not allow a market with an empty town', async town => {
    const command = TestRegisterMarketSchedule.withMarket({ town });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it.each([
    ' ',
    ''
  ])('should not allow a market with an empty id', async id => {
    const command = TestRegisterMarketSchedule.withMarket({ id });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it.each([
    'abc',
    '7500',
    '750011',
    '75 01',
    ' ',
    ''
  ])('should not allow a market with an invalid code postal', async codePostal => {
    const command = TestRegisterMarketSchedule.withMarket({ codePostal });
    await expect(handler.execute(command)).rejects.toThrow(InvalidPostalCodeError);
  });

  it('trims a valid code postal', async () => {
    const command = TestRegisterMarketSchedule.withMarket({ codePostal: ' 75020 ' });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({
        market: expect.objectContaining({ codePostal: '75020' })
      })
    })]);
  });

  it.each([
    ' ',
    ''
  ])('should not allow a schedule with an empty id', async scheduleId => {
    const command = TestRegisterMarketSchedule.with({ scheduleId });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it('registers a one-off schedule', async () => {
    const command = TestRegisterMarketSchedule.with({ frequency: 'once' });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([expect.objectContaining({
      type: 'MarketScheduleRegistered',
      payload: expect.objectContaining({ frequency: 'once' })
    })]);
  });

  it('rejects registering a schedule whose id is already registered', async () => {
    await handler.execute(TestRegisterMarketSchedule.simple());

    await expect(handler.execute(TestRegisterMarketSchedule.simple())).rejects.toThrow(ScheduleAlreadyRegisteredError);
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
