import { FindVendorSchedules, FindVendorSchedulesHandler, InMemoryMarketScheduleViews, MarketScheduleView } from '@market-miam/market-days';

describe('FindVendorSchedules', () => {
  let views: InMemoryMarketScheduleViews;
  let handler: FindVendorSchedulesHandler;

  beforeEach(() => {
    views = new InMemoryMarketScheduleViews();
    handler = new FindVendorSchedulesHandler(views);
  });

  const schedule: MarketScheduleView = {
    scheduleId: 'schedule-1',
    market: { id: 'market-1', name: 'Marché de Belleville', streetAddress: 'Boulevard de Belleville', codePostal: '75011', town: 'Paris', pitch: 'B12' },
    startDate: '2026-07-15',
    days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
    frequency: { weeks: 1 },
  };

  it('returns no schedules for a vendor with none', async () => {
    expect(await handler.execute(new FindVendorSchedules('vendor-id'))).toEqual({ schedules: [] });
  });

  it('returns the queried vendor schedules', async () => {
    await views.recordSchedule(schedule, 'vendor-id');

    expect(await handler.execute(new FindVendorSchedules('vendor-id'))).toEqual({ schedules: [schedule] });
  });

  it('scopes the schedules to the queried vendor', async () => {
    await views.recordSchedule(schedule, 'vendor-a');

    expect(await handler.execute(new FindVendorSchedules('vendor-b'))).toEqual({ schedules: [] });
  });
});
