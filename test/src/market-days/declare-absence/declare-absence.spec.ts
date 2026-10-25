import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  Calendars,
  DeclareAbsence,
  DeclareAbsenceHandler,
  InvalidDateRangeError,
  NoSuchScheduleError,
  VendorScopedEvents
} from '@market-miam/market-days';
import { absenceDeclared, calendarStream, scheduleRegistered } from '../calendar-events';

describe('Declare Absence', () => {
  let store: InMemoryEventStore;
  let handler: DeclareAbsenceHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new DeclareAbsenceHandler(new Calendars(new VendorScopedEvents(store)));
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(calendarStream('vendor-id'), history, { vendorId: 'vendor-id' });

  const declare = (from: string, to: string, scheduleId = 'schedule-id'): DeclareAbsence =>
    new DeclareAbsence({ vendorId: 'vendor-id', scheduleId, from, to });

  it('declares an absence over a date range for a registered schedule', async () => {
    given(scheduleRegistered());

    await handler.execute(declare('2023-09-16', '2023-09-30'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: 'schedule-id', from: '2023-09-16', to: '2023-09-30' },
      }),
    ]);
  });

  it('declares a single-day absence as a range with matching from and to', async () => {
    given(scheduleRegistered());

    await handler.execute(declare('2023-09-16', '2023-09-16'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: 'schedule-id', from: '2023-09-16', to: '2023-09-16' },
      }),
    ]);
  });

  it('rejects declaring an absence against a schedule that was never registered', async () => {
    given(scheduleRegistered());

    await expect(handler.execute(declare('2023-09-16', '2023-09-16', 'never-registered'))).rejects.toThrow(NoSuchScheduleError);
  });

  it('rejects a range whose end is before its start', async () => {
    given(scheduleRegistered());

    await expect(handler.execute(declare('2023-09-30', '2023-09-16'))).rejects.toThrow(InvalidDateRangeError);
  });

  it('allows a second overlapping absence range', async () => {
    given(scheduleRegistered(), absenceDeclared('2023-09-16', '2023-09-30'));

    await handler.execute(declare('2023-09-23', '2023-10-07'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'AbsenceDeclared',
        payload: { scheduleId: 'schedule-id', from: '2023-09-23', to: '2023-10-07' },
      }),
    ]);
  });
});
