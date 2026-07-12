import {
  FindUpcomingMarketDays,
  FindUpcomingMarketDaysHandler,
  InMemoryMarketScheduleViews,
  MarketScheduleView,
  UpcomingMarketDaysView
} from '@market-miam/market-days';
import { Clock, Instant, LocalDate } from '@market-miam/common';

const clockAt = (date: string): Clock => ({
  today: () => new LocalDate(date),
  now: () => new Instant('2024-01-01T00:00:00.000Z'),
});

const market = {
  id: 'market-1',
  name: 'Marché de Belleville',
  streetAddress: 'Boulevard de Belleville',
  codePostal: '75011',
  town: 'Paris',
  pitch: 'B12',
};

const marketDisplay = {
  name: 'Marché de Belleville',
  town: 'Paris',
  codePostal: '75011',
  streetAddress: 'Boulevard de Belleville',
  pitch: 'B12',
};

function scheduleWith(overrides: Partial<MarketScheduleView>): MarketScheduleView {
  return {
    scheduleId: 'schedule-1',
    market,
    startDate: '2024-02-05',
    days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
    frequency: { weeks: 1 },
    ...overrides,
  };
}

describe('FindUpcomingMarketDays', () => {
  let views: InMemoryMarketScheduleViews;

  beforeEach(() => {
    views = new InMemoryMarketScheduleViews();
  });

  function upcoming(vendorId: string, today = '2024-01-01') {
    return new FindUpcomingMarketDaysHandler(views, clockAt(today)).execute(new FindUpcomingMarketDays(vendorId));
  }

  const dates = (view: UpcomingMarketDaysView) => view.marketDays.map(d => ({ date: d.date, day: d.day }));

  it('returns nothing for a vendor with no schedules', async () => {
    expect(await upcoming('vendor-id')).toEqual({ marketDays: [] });
  });

  it('expands a weekly schedule into fully-described occurrences within the window', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');

    expect(await upcoming('vendor-id')).toEqual({
      marketDays: ['2024-02-10', '2024-02-17', '2024-02-24'].map(date => ({
        scheduleId: 'schedule-1',
        marketId: 'market-1',
        date,
        day: 'SAT',
        startTime: '08:00',
        endTime: '14:00',
        absent: false,
        market: marketDisplay,
      })),
    });
  });

  it('starts the window at today, not before, when the schedule started earlier', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2023-06-01' }), 'vendor-id');

    expect(dates(await upcoming('vendor-id')).map(d => d.date)).toEqual([
      '2024-01-06', '2024-01-13', '2024-01-20', '2024-01-27',
      '2024-02-03', '2024-02-10', '2024-02-17', '2024-02-24',
    ]);
  });

  it('applies every-N-weeks cadence anchored on the start week (Rule A)', async () => {
    await views.recordSchedule(
      scheduleWith({ startDate: '2024-01-01', days: [{ day: 'MON' }], frequency: { weeks: 2 } }),
      'vendor-id',
    );

    expect(dates(await upcoming('vendor-id')).map(d => d.date)).toEqual([
      '2024-01-01', '2024-01-15', '2024-01-29', '2024-02-12', '2024-02-26',
    ]);
  });

  it('yields a one-off only in the start week', async () => {
    await views.recordSchedule(
      scheduleWith({ startDate: '2024-01-03', days: [{ day: 'SAT' }], frequency: 'once' }),
      'vendor-id',
    );

    expect(dates(await upcoming('vendor-id'))).toEqual([{ date: '2024-01-06', day: 'SAT' }]);
  });

  it('emits one occurrence per day for a multi-day schedule, chronologically', async () => {
    await views.recordSchedule(
      scheduleWith({ startDate: '2024-02-05', days: [{ day: 'SAT' }, { day: 'SUN' }] }),
      'vendor-id',
    );

    expect(dates(await upcoming('vendor-id'))).toEqual([
      { date: '2024-02-10', day: 'SAT' }, { date: '2024-02-11', day: 'SUN' },
      { date: '2024-02-17', day: 'SAT' }, { date: '2024-02-18', day: 'SUN' },
      { date: '2024-02-24', day: 'SAT' }, { date: '2024-02-25', day: 'SUN' },
    ]);
  });

  it('merges occurrences across schedules into one chronological list', async () => {
    await views.recordSchedule(scheduleWith({ scheduleId: 'schedule-1', startDate: '2024-02-05', days: [{ day: 'SAT' }] }), 'vendor-id');
    await views.recordSchedule(scheduleWith({ scheduleId: 'schedule-2', startDate: '2024-02-05', days: [{ day: 'WED' }] }), 'vendor-id');

    expect(dates(await upcoming('vendor-id')).map(d => d.date)).toEqual([
      '2024-02-07', '2024-02-10', '2024-02-14', '2024-02-17', '2024-02-21', '2024-02-24',
    ]);
  });

  it('scopes occurrences to the queried vendor', async () => {
    await views.recordSchedule(scheduleWith({}), 'vendor-a');

    expect(await upcoming('vendor-b')).toEqual({ marketDays: [] });
  });

  it('marks occurrences within a declared absence range as absent', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05', days: [{ day: 'SAT' }] }), 'vendor-id');
    await views.recordAbsence('schedule-1', 'vendor-id', { from: '2024-02-15', to: '2024-02-20' });

    expect((await upcoming('vendor-id')).marketDays.map(d => ({ date: d.date, absent: d.absent }))).toEqual([
      { date: '2024-02-10', absent: false },
      { date: '2024-02-17', absent: true },
      { date: '2024-02-24', absent: false },
    ]);
  });
});
