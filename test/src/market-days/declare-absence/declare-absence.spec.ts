import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  DeclareAbsence,
  DeclareAbsenceHandler,
  InvalidDateRangeError,
  NoSuchScheduleError,
  RegisterMarketScheduleHandler,
  VendorScopedEvents
} from '@market-miam/market-days';
import { TestRegisterMarketSchedule } from '../register-market-schedule/test-data';

describe('Declare Absence', () => {
  let store: InMemoryEventStore;
  let calendars: Calendars;
  let handler: DeclareAbsenceHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    calendars = new Calendars(new VendorScopedEvents(store));
    handler = new DeclareAbsenceHandler(calendars);
  });

  async function registerSchedule() {
    const registered = TestRegisterMarketSchedule.simple();
    await new RegisterMarketScheduleHandler(calendars).execute(registered);
    return registered;
  }

  it('declares an absence over a date range for a registered schedule', async () => {
    const registered = await registerSchedule();

    await handler.execute(new DeclareAbsence({
      vendorId: registered.vendorId,
      scheduleId: registered.scheduleId,
      from: '2023-09-16',
      to: '2023-09-30',
    }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: registered.scheduleId, from: '2023-09-16', to: '2023-09-30' },
      }),
    ]);
  });

  it('declares a single-day absence as a range with matching from and to', async () => {
    const registered = await registerSchedule();

    await handler.execute(new DeclareAbsence({
      vendorId: registered.vendorId,
      scheduleId: registered.scheduleId,
      from: '2023-09-16',
      to: '2023-09-16',
    }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: registered.scheduleId, from: '2023-09-16', to: '2023-09-16' },
      }),
    ]);
  });

  it('rejects declaring an absence against a schedule that was never registered', async () => {
    const registered = await registerSchedule();

    await expect(handler.execute(new DeclareAbsence({
      vendorId: registered.vendorId,
      scheduleId: 'never-registered',
      from: '2023-09-16',
      to: '2023-09-16',
    }))).rejects.toThrow(NoSuchScheduleError);
  });

  it('rejects a range whose end is before its start', async () => {
    const registered = await registerSchedule();

    await expect(handler.execute(new DeclareAbsence({
      vendorId: registered.vendorId,
      scheduleId: registered.scheduleId,
      from: '2023-09-30',
      to: '2023-09-16',
    }))).rejects.toThrow(InvalidDateRangeError);
  });

  it('allows a second overlapping absence range', async () => {
    const registered = await registerSchedule();
    await handler.execute(new DeclareAbsence({
      vendorId: registered.vendorId,
      scheduleId: registered.scheduleId,
      from: '2023-09-16',
      to: '2023-09-30',
    }));

    await handler.execute(new DeclareAbsence({
      vendorId: registered.vendorId,
      scheduleId: registered.scheduleId,
      from: '2023-09-23',
      to: '2023-10-07',
    }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'MarketScheduleRegistered' }),
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: registered.scheduleId, from: '2023-09-16', to: '2023-09-30' },
      }),
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: registered.scheduleId, from: '2023-09-23', to: '2023-10-07' },
      }),
    ]);
  });
});
