import {
  CatalogueViewItem,
  FindUpcomingMarketDays,
  FindUpcomingMarketDaysHandler,
  InMemoryCatalogueViews,
  InMemoryMarketDayViews,
  InMemoryMarketScheduleViews,
  MarketScheduleView,
  UpcomingMarketDaysView
} from '@market-miam/market-days';
import { clockAt } from '../../clock-at';

const market = {
  name: 'Marché de Belleville',
  streetAddress: 'Boulevard de Belleville',
  codePostal: '75011',
  town: 'Paris',
  pitch: 'B12',
};

function scheduleWith(overrides: Partial<MarketScheduleView>): MarketScheduleView {
  return {
    scheduleId: 'schedule-1',
    marketId: 'market-1',
    market,
    startDate: '2024-02-05',
    days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
    frequency: { weeks: 1 },
    ...overrides,
  };
}

function item(itemId: string, name: string): CatalogueViewItem {
  return { itemId, name, description: '', price: 500, imageReference: '' };
}

describe('FindUpcomingMarketDays', () => {
  let views: InMemoryMarketScheduleViews;
  let menus: InMemoryMarketDayViews;
  let catalogues: InMemoryCatalogueViews;

  beforeEach(() => {
    views = new InMemoryMarketScheduleViews();
    menus = new InMemoryMarketDayViews();
    catalogues = new InMemoryCatalogueViews();
  });

  function upcoming(vendorId: string, today = '2024-01-01', now = '2024-01-01T00:00:00.000Z') {
    return new FindUpcomingMarketDaysHandler(views, menus, catalogues, clockAt(today, now)).execute(new FindUpcomingMarketDays(vendorId));
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
        inProgress: false,
        items: [],
        soldOutItemIds: [],
        market,
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

  it('yields nothing for a schedule starting after the window ends', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-06-01' }), 'vendor-id');

    expect(await upcoming('vendor-id')).toEqual({ marketDays: [] });
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

  it('joins the day\'s menu from the catalogue, in catalogue order', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-2', 'Tatin'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-2', 'item-1'] }, 'vendor-id');

    const { marketDays } = await upcoming('vendor-id');

    expect(marketDays.map(d => ({ date: d.date, items: d.items.map(item => item.name) }))).toEqual([
      { date: '2024-02-10', items: ['Bourguignon', 'Tatin'] },
      { date: '2024-02-17', items: [] },
      { date: '2024-02-24', items: [] },
    ]);
  });

  it('serves the menu with the item\'s current catalogue detail, not what it was when planned', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1'] }, 'vendor-id');

    await catalogues.reviseItem('item-1', { name: 'Bœuf bourguignon', description: 'Mijoté', price: 1300, variants: undefined }, 'vendor-id');

    const { marketDays } = await upcoming('vendor-id');
    expect(marketDays[0].items).toEqual([
      { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté', price: 1300, imageReference: '', variants: undefined },
    ]);
  });

  it('drops a planned item the catalogue has since retired', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-2', 'Tatin'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1', 'item-2'] }, 'vendor-id');

    await catalogues.retireItem('item-1', 'vendor-id');

    const { marketDays } = await upcoming('vendor-id');
    expect(marketDays[0].items.map(item => item.itemId)).toEqual(['item-2']);
  });

  it('keys the menu join by market, not by date alone', async () => {
    await views.recordSchedule(scheduleWith({ scheduleId: 'schedule-1', marketId: 'market-1', startDate: '2024-02-05' }), 'vendor-id');
    await views.recordSchedule(scheduleWith({ scheduleId: 'schedule-2', marketId: 'market-2', startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1'] }, 'vendor-id');

    const { marketDays } = await upcoming('vendor-id');

    const sameDay = marketDays.filter(d => d.date === '2024-02-10');
    expect(sameDay.map(d => ({ marketId: d.marketId, items: d.items.map(item => item.name) }))).toEqual([
      { marketId: 'market-1', items: ['Bourguignon'] },
      { marketId: 'market-2', items: [] },
    ]);
  });

  // Menus are read as one window now, so that window has to span the same period the
  // occurrences do — a narrower one would quietly strip the far end of the horizon.
  it('joins menus across the whole horizon, not just the days nearest today', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2023-06-01' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-24', itemIds: ['item-1'] }, 'vendor-id');

    const { marketDays } = await upcoming('vendor-id');

    const last = marketDays[marketDays.length - 1];
    expect({ date: last.date, items: last.items.map(item => item.name) })
      .toEqual({ date: '2024-02-24', items: ['Bourguignon'] });
  });

  // A vendor with markets on consecutive days has to be able to plan tomorrow's menu the
  // evening today's market ends. Instants are UTC; January is CET, so Paris reads +1.
  it('drops today once its market has ended', async () => {
    await views.recordSchedule(
      scheduleWith({ startDate: '2024-01-06', days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }] }),
      'vendor-id',
    );

    const { marketDays } = await upcoming('vendor-id', '2024-01-06', '2024-01-06T14:30:00.000Z');

    expect(marketDays.map(d => d.date)).toEqual([
      '2024-01-13', '2024-01-20', '2024-01-27', '2024-02-03',
      '2024-02-10', '2024-02-17', '2024-02-24', '2024-03-02',
    ]);
  });

  it('keeps a market that has started but not ended', async () => {
    await views.recordSchedule(
      scheduleWith({ startDate: '2024-01-06', days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }] }),
      'vendor-id',
    );

    const { marketDays } = await upcoming('vendor-id', '2024-01-06', '2024-01-06T12:00:00.000Z');

    expect(marketDays[0].date).toEqual('2024-01-06');
  });

  it('keeps a day with no end time until its calendar day is over', async () => {
    await views.recordSchedule(
      scheduleWith({ startDate: '2024-01-06', days: [{ day: 'SAT' }] }),
      'vendor-id',
    );

    const { marketDays } = await upcoming('vendor-id', '2024-01-06', '2024-01-06T21:00:00.000Z');

    expect(marketDays[0].date).toEqual('2024-01-06');
  });

  // 10:00Z is 11:00 in February's Paris (CET) — mid-market for an 08:00–14:00 day.
  it('flags the occurrence whose market is running right now, and only that one', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');

    const { marketDays } = await upcoming('vendor-id', '2024-02-10', '2024-02-10T10:00:00.000Z');

    expect(marketDays[0]).toMatchObject({ date: '2024-02-10', inProgress: true });
    expect(marketDays.slice(1).every(day => !day.inProgress)).toBe(true);
  });

  it('does not flag a market before its start time', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');

    const { marketDays } = await upcoming('vendor-id', '2024-02-10', '2024-02-10T06:00:00.000Z');

    expect(marketDays[0]).toMatchObject({ date: '2024-02-10', inProgress: false });
  });

  it('never flags an absent day, even during its hours', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await views.recordAbsence('schedule-1', 'vendor-id', { from: '2024-02-10', to: '2024-02-10' });

    const { marketDays } = await upcoming('vendor-id', '2024-02-10', '2024-02-10T10:00:00.000Z');

    expect(marketDays[0]).toMatchObject({ date: '2024-02-10', absent: true, inProgress: false });
  });

  it("carries the day's sold-out marks onto its occurrence", async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-2', 'Tatin'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1', 'item-2'] }, 'vendor-id');
    await menus.markSoldOut({ marketId: 'market-1', date: '2024-02-10', itemId: 'item-1' }, 'vendor-id');

    const { marketDays } = await upcoming('vendor-id');

    expect(marketDays.map(d => ({ date: d.date, soldOutItemIds: d.soldOutItemIds }))).toEqual([
      { date: '2024-02-10', soldOutItemIds: ['item-1'] },
      { date: '2024-02-17', soldOutItemIds: [] },
      { date: '2024-02-24', soldOutItemIds: [] },
    ]);
  });

  it('suppresses sold-out marks along with the menu on an absent day', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1'] }, 'vendor-id');
    await menus.markSoldOut({ marketId: 'market-1', date: '2024-02-10', itemId: 'item-1' }, 'vendor-id');
    await views.recordAbsence('schedule-1', 'vendor-id', { from: '2024-02-10', to: '2024-02-10' });

    const { marketDays } = await upcoming('vendor-id');
    expect(marketDays[0]).toMatchObject({ date: '2024-02-10', absent: true, items: [], soldOutItemIds: [] });
  });

  it('suppresses the menu on a day the vendor is absent', async () => {
    await views.recordSchedule(scheduleWith({ startDate: '2024-02-05' }), 'vendor-id');
    await catalogues.addItemToCatalogue(item('item-1', 'Bourguignon'), 'vendor-id');
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1'] }, 'vendor-id');
    await views.recordAbsence('schedule-1', 'vendor-id', { from: '2024-02-10', to: '2024-02-10' });

    const { marketDays } = await upcoming('vendor-id');
    expect(marketDays[0]).toMatchObject({ date: '2024-02-10', absent: true, items: [] });
  });
});
