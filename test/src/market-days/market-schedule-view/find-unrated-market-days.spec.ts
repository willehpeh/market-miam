import {
  FindUnratedMarketDays,
  FindUnratedMarketDaysHandler,
  InMemoryCatalogueViews,
  InMemoryMarketDayViews,
  InMemoryMarketScheduleViews,
  MarketScheduleView
} from '@market-miam/market-days';
import { clockAt } from '../../clock-at';

const market = { name: 'Marché de Belleville', codePostal: '75011', town: 'Paris' };

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

describe('FindUnratedMarketDays', () => {
  let views: InMemoryMarketScheduleViews;
  let menus: InMemoryMarketDayViews;
  let catalogues: InMemoryCatalogueViews;

  beforeEach(async () => {
    views = new InMemoryMarketScheduleViews();
    menus = new InMemoryMarketDayViews();
    catalogues = new InMemoryCatalogueViews();
    await catalogues.addItemToCatalogue(
      { itemId: 'item-1', name: 'Bourguignon', description: '', price: 1300, imageReference: '' }, 'vendor-id');
    await catalogues.addItemToCatalogue(
      { itemId: 'item-2', name: 'Tatin', description: '', price: 700, imageReference: '' }, 'vendor-id');
  });

  // The Saturday before: 2024-02-10 is a Saturday, so 2024-02-17 is the following one.
  const SATURDAY = '2024-02-10';

  function findUnrated(today = '2024-02-12', now = `${today}T09:00:00.000Z`) {
    return new FindUnratedMarketDaysHandler(views, menus, catalogues, clockAt(today, now))
      .execute(new FindUnratedMarketDays('vendor-id'));
  }

  const planned = (itemIds: string[]) => menus.setMenu({ marketId: 'market-1', date: SATURDAY, itemIds }, 'vendor-id');

  // Decision 65: the upcoming list drops a day at endTime, so a market that finished on
  // Saturday is in no list the vendor's app reads — and the prompt is the only thing that
  // will ask them about it.
  it('names a finished day whose dishes were never judged', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1', 'item-2']);

    expect(await findUnrated()).toEqual({
      marketDays: [{ marketId: 'market-1', date: SATURDAY, day: 'SAT', marketName: 'Marché de Belleville' }],
    });
  });

  // Decision 65: partial counts as unrated — a vendor who answered one of two has an
  // incomplete bilan, and nothing else on the dashboard would tell them.
  it('keeps asking while some dish on the menu has no outcome', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1', 'item-2']);
    await menus.recordBilan({ marketId: 'market-1', date: SATURDAY, outcomes: { 'item-1': 'did_well' } }, 'vendor-id');

    expect((await findUnrated()).marketDays).toHaveLength(1);
  });

  it('stops asking once every dish has been judged', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1', 'item-2']);
    await menus.recordBilan(
      { marketId: 'market-1', date: SATURDAY, outcomes: { 'item-1': 'did_well', 'item-2': 'sold_out' } },
      'vendor-id',
    );

    expect((await findUnrated()).marketDays).toEqual([]);
  });

  // A retired dish leaves the catalogue join, so it is not a planned item any more — and
  // a day carrying one would otherwise nag for ever, with no row on the bilan to clear it.
  it('ignores a dish the vendor has since retired', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1', 'item-2']);
    await catalogues.retireItem('item-2', 'vendor-id');
    await menus.recordBilan({ marketId: 'market-1', date: SATURDAY, outcomes: { 'item-1': 'did_well' } }, 'vendor-id');

    expect((await findUnrated()).marketDays).toEqual([]);
  });

  // A day nobody planned has nothing to judge, and the *je ne peux pas venir* close leaves
  // exactly that — a real day with an empty menu.
  it('passes over a finished day that carried no menu', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');

    expect((await findUnrated()).marketDays).toEqual([]);
  });

  // A vendor who planned the Saturday and then declared themselves away has no market to
  // judge — the day's menu is suppressed everywhere else too.
  it('passes over a day the vendor declared themselves absent for', async () => {
    await views.recordSchedule(scheduleWith({ absences: [{ from: SATURDAY, to: SATURDAY }] }), 'vendor-id');
    await planned(['item-1']);

    expect((await findUnrated()).marketDays).toEqual([]);
  });

  // The domain takes a bilan for a finished day alone (decision 69), so the prompt never
  // offers one for a market still to be traded.
  it('passes over a market that has not finished yet', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1']);

    expect((await findUnrated(SATURDAY, `${SATURDAY}T09:00:00.000Z`)).marketDays).toEqual([]);
  });

  // The clock ended it this afternoon: decision 65's motivating case, a vendor at 15h with
  // today's market in no list their app reads.
  it('asks about a market the clock ended earlier today', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1']);

    expect((await findUnrated(SATURDAY, `${SATURDAY}T14:00:00.000Z`)).marketDays).toHaveLength(1);
  });

  // A vendor who packed up at 11h is finished whatever the clock says (decision 69), and
  // the bilan screen would take their judgments — so the prompt offers it.
  it('asks about a stand the vendor closed early', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1']);
    await menus.close({ marketId: 'market-1', date: SATURDAY, time: '11:00' }, 'vendor-id');

    expect((await findUnrated(SATURDAY, `${SATURDAY}T10:00:00.000Z`)).marketDays).toHaveLength(1);
  });

  // Decision 75: *je ne peux pas venir* at 7h for a market that opens at 8h is a day the
  // vendor never stood at, so there is nothing to look back on — and the clock running past
  // 14h does not make something. The aggregate refuses the bilan; the prompt never offers it.
  it('passes over a stand called off before its market opened', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1']);
    await menus.close({ marketId: 'market-1', date: SATURDAY, time: '07:00' }, 'vendor-id');

    expect((await findUnrated(SATURDAY, `${SATURDAY}T15:00:00.000Z`)).marketDays).toEqual([]);
  });

  // Seven days, not unbounded: a backlog from the first market day onward turns a nudge
  // into a list, and one week clears a weekly market with room spare.
  it('forgets a market older than a week', async () => {
    await views.recordSchedule(scheduleWith(), 'vendor-id');
    await planned(['item-1']);

    expect((await findUnrated('2024-02-18')).marketDays).toEqual([]);
  });

  // Oldest first: the day about to fall out of the window is the one worth clearing.
  it('asks about the oldest market first', async () => {
    await views.recordSchedule(scheduleWith({ days: [{ day: 'SAT' }, { day: 'SUN' }] }), 'vendor-id');
    await planned(['item-1']);
    await menus.setMenu({ marketId: 'market-1', date: '2024-02-11', itemIds: ['item-1'] }, 'vendor-id');

    expect((await findUnrated()).marketDays.map(day => day.date)).toEqual([SATURDAY, '2024-02-11']);
  });
});
