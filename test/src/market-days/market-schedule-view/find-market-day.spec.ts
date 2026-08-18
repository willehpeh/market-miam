import {
  FindMarketDay,
  FindMarketDayHandler,
  InMemoryCatalogueViews,
  InMemoryMarketDayViews,
  InMemoryMarketScheduleViews,
  MarketScheduleView
} from '@market-miam/market-days';
import { clockAt } from '../../clock-at';

const market = {
  name: 'Marché de Belleville',
  streetAddress: 'Boulevard de Belleville',
  codePostal: '75011',
  town: 'Paris',
  pitch: 'B12',
};

// Saturdays, weekly, from well before any date these specs ask about.
function scheduleWith(overrides: Partial<MarketScheduleView> = {}): MarketScheduleView {
  return {
    scheduleId: 'schedule-1',
    marketId: 'market-1',
    market,
    startDate: '2024-01-06',
    days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
    frequency: { weeks: 1 },
    ...overrides,
  };
}

describe('FindMarketDay', () => {
  let views: InMemoryMarketScheduleViews;
  let menus: InMemoryMarketDayViews;
  let catalogues: InMemoryCatalogueViews;

  beforeEach(() => {
    views = new InMemoryMarketScheduleViews();
    menus = new InMemoryMarketDayViews();
    catalogues = new InMemoryCatalogueViews();
  });

  function findDay(date: string, today = '2024-02-10', now = '2024-02-10T09:00:00.000Z') {
    return new FindMarketDayHandler(views, menus, catalogues, clockAt(today, now))
      .execute(new FindMarketDay('vendor-id', 'market-1', date));
  }

  it('describes the day the vendor is standing at', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');

    expect(await findDay('2024-02-10')).toEqual({
      scheduleId: 'schedule-1',
      marketId: 'market-1',
      date: '2024-02-10',
      day: 'SAT',
      startTime: '08:00',
      endTime: '14:00',
      absent: false,
      inProgress: true,
      today: true,
      items: [],
      closed: false,
      soldOutItemIds: [],
      market,
    });
  });

  // Why this query exists: the upcoming window looks forward only, and a vendor keeps the
  // right to look at a day they closed — long after it has left every list.
  it('describes a day the vendor closed months ago', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await catalogues.addItemToCatalogue(
      { itemId: 'item-1', name: 'Bourguignon', description: '', price: 500, imageReference: '' },
      'vendor-id',
    );
    await menus.setMenu({ marketId: 'market-1', date: '2024-01-13', itemIds: ['item-1'] }, 'vendor-id');
    await menus.markSoldOut({ marketId: 'market-1', date: '2024-01-13', itemId: 'item-1' }, 'vendor-id');
    await menus.close({ marketId: 'market-1', date: '2024-01-13' }, 'vendor-id');

    expect(await findDay('2024-01-13')).toMatchObject({
      date: '2024-01-13',
      closed: true,
      today: false,
      items: [expect.objectContaining({ itemId: 'item-1' })],
      soldOutItemIds: ['item-1'],
    });
  });

  // A vendor can hold more than one schedule at the same market — a Saturday morning and a
  // Tuesday evening pitch. The day asked for decides which one describes it.
  it('describes the day from whichever of the market\'s schedules covers it', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await views.recordSchedule(scheduleWith({
      scheduleId: 'schedule-2',
      days: [{ day: 'TUE', startTime: '17:00', endTime: '20:00' }],
    }), 'vendor-id');

    expect(await findDay('2024-02-13')).toMatchObject({
      scheduleId: 'schedule-2',
      date: '2024-02-13',
      day: 'TUE',
      startTime: '17:00',
      endTime: '20:00',
    });
  });

  it('suppresses the menu on a day the vendor declared absent from', async () => {
    await views.recordSchedule(
      scheduleWith({ absences: [{ from: '2024-02-10', to: '2024-02-10' }] }),
      'vendor-id',
    );
    await catalogues.addItemToCatalogue(
      { itemId: 'item-1', name: 'Bourguignon', description: '', price: 500, imageReference: '' },
      'vendor-id',
    );
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-10', itemIds: ['item-1'] }, 'vendor-id');

    expect(await findDay('2024-02-10')).toMatchObject({
      absent: true,
      inProgress: false,
      items: [],
      soldOutItemIds: [],
    });
  });

  it('finds nothing on a date the market does not recur on', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');

    expect(await findDay('2024-02-11')).toBeUndefined();
  });

  it('finds nothing at a market the vendor has no schedule for', async () => {
    await views.recordSchedule(scheduleWith({ marketId: 'market-2' }), 'vendor-id');

    expect(await findDay('2024-02-10')).toBeUndefined();
  });
});
