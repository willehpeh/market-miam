import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  FindLiveMarketDay,
  FindLiveMarketDayHandler,
  InMemoryCatalogueViews,
  InMemoryMarketPricesViews,
  InMemoryMarketScheduleViews,
  MarketScheduleView,
} from '@market-miam/market-days';
import { VendorScopedEvents } from '@market-miam/shared-kernel';
import { clockAt } from '../../clock-at';
import { available, closed, menuSet, reopened, soldOut } from '../market-day-events';
import { TODAY } from '../set-market-day-menu/test-data';

const fridaysAtBelleville: MarketScheduleView = {
  scheduleId: 'schedule-1',
  marketId: 'market-1',
  market: { name: 'Marché de Belleville', codePostal: '75011', town: 'Paris' },
  startDate: '2026-01-02',
  days: [{ day: 'FRI', startTime: '08:00', endTime: '14:00' }],
  frequency: { weeks: 1 },
};

const MID_MARKET = `${TODAY}T09:00:00.000Z`;

describe('Find Live Market Day', () => {
  let store: InMemoryEventStore;
  let schedules: InMemoryMarketScheduleViews;
  let catalogues: InMemoryCatalogueViews;
  let prices: InMemoryMarketPricesViews;

  beforeEach(async () => {
    store = new InMemoryEventStore();
    schedules = new InMemoryMarketScheduleViews();
    catalogues = new InMemoryCatalogueViews();
    prices = new InMemoryMarketPricesViews();
    await schedules.recordSchedule(fridaysAtBelleville, 'vendor-1');
  });

  const given = (...history: DomainEvent[]): void =>
    store.seedWith(`market-day/vendor-1/market-1/${TODAY}`, history, { vendorId: 'vendor-1' });

  const findLiveDay = (now = MID_MARKET) =>
    new FindLiveMarketDayHandler(new VendorScopedEvents(store), schedules, clockAt(now.slice(0, 10), now), catalogues, prices)
      .execute(new FindLiveMarketDay('vendor-1', 'market-1', TODAY));

  it('reports the day’s menu and its sold-out dishes, read from the day’s own events', async () => {
    given(menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY, 'item-2'));

    expect(await findLiveDay()).toMatchObject({
      itemIds: ['item-1', 'item-2'],
      soldOutItemIds: ['item-2'],
    });
  });

  it('names and prices its dishes as the storefront does, each marked sold out or not', async () => {
    await catalogues.addItemToCatalogue(
      { itemId: 'item-1', name: 'Bourguignon', description: '', price: 500, imageReference: '', allergens: null },
      'vendor-1',
    );
    await catalogues.addItemToCatalogue(
      {
        itemId: 'item-2',
        name: 'Pizza',
        description: '',
        imageReference: '',
        allergens: null,
        variants: [
          { name: 'Margherita', description: '', price: 900 },
          { name: 'Pepperoni', description: '', price: 1200 },
        ],
      },
      'vendor-1',
    );
    await prices.setPrices({ marketId: 'market-1', prices: { 'item-1': 600 } }, 'vendor-1');
    given(menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY, 'item-2'));

    expect((await findLiveDay())?.dishes).toEqual([
      { itemId: 'item-1', name: 'Bourguignon', price: 600, soldOut: false },
      {
        itemId: 'item-2',
        name: 'Pizza',
        variants: [
          { name: 'Margherita', price: 900 },
          { name: 'Pepperoni', price: 1200 },
        ],
        soldOut: true,
      },
    ]);
  });

  it('no longer reports a dish sold out once the vendor marks it available again', async () => {
    given(menuSet(TODAY, 'item-1', 'item-2'), soldOut(TODAY, 'item-2'), available(TODAY, 'item-2'));

    expect(await findLiveDay()).toMatchObject({
      soldOutItemIds: [],
    });
  });

  it('reports the day closed once the vendor closes it by hand', async () => {
    given(menuSet(TODAY, 'item-1'), closed(TODAY));

    expect(await findLiveDay()).toMatchObject({ closed: true });
  });

  it('no longer reports the day closed once the vendor reopens it', async () => {
    given(menuSet(TODAY, 'item-1'), closed(TODAY), reopened(TODAY, '11:30'));

    expect(await findLiveDay()).toMatchObject({ closed: false });
  });

  it.each([
    ['due', 'at 07:00 in Paris, before its market opens', `${TODAY}T05:00:00.000Z`],
    ['trading', 'at 11:00 in Paris, while its market is open', `${TODAY}T09:00:00.000Z`],
    ['over', 'at 15:00 in Paris, once its market has closed', `${TODAY}T13:00:00.000Z`],
    ['past', 'the morning after', '2026-06-20T09:00:00.000Z'],
    ['future', 'the morning before', '2026-06-18T09:00:00.000Z'],
  ])('reports the day as %s %s', async (phase, _, now) => {
    expect(await findLiveDay(now)).toMatchObject({ phase });
  });

  it('reports no live day once no schedule covers the date, even with a menu on record', async () => {
    given(menuSet(TODAY, 'item-1'));
    await schedules.cancelSchedule('schedule-1', 'vendor-1');

    await expect(findLiveDay()).resolves.toBeUndefined();
  });
});
