import {
  FindSellingRecord,
  FindSellingRecordHandler,
  InMemoryMarketDayViews,
} from '@market-miam/market-days';
import type { ItemOutcome } from '@market-miam/market-days';
import { clockAt } from '../../clock-at';

// What the bilan says once there are several of them (BILAN-RETROSPECTIVE-PLAN.md). The
// setup is one line on purpose: unlike FindUnratedMarketDays, this read needs no schedule
// and no catalogue — a day only carries outcomes if the aggregate already accepted a bilan
// for it, so a called-off day, a day inside an absence and a day still trading all
// contribute nothing without anyone having to ask a clock.
describe('FindSellingRecord', () => {
  let menus: InMemoryMarketDayViews;

  beforeEach(() => {
    menus = new InMemoryMarketDayViews();
  });

  const findRecord = (today = '2026-08-22') =>
    new FindSellingRecordHandler(menus, clockAt(today)).execute(new FindSellingRecord('vendor-id'));

  // A day is only judged after it was planned: the aggregate refuses an outcome for an item
  // the menu never carried, so every fixture here sets the menu first.
  const judged = async (date: string, outcomes: Record<string, ItemOutcome>) => {
    await menus.setMenu({ marketId: 'market-1', date, itemIds: Object.keys(outcomes) }, 'vendor-id');
    await menus.recordBilan({ marketId: 'market-1', date, outcomes }, 'vendor-id');
  };

  // Oldest first (decision 6): the sequence is the only thing in this feature that can show
  // a direction, and reversed it makes a dish getting better read as one getting worse.
  it('reads back what the vendor said about a dish, oldest bilan first', async () => {
    await judged('2026-07-04', { 'item-1': 'did_well' });
    await judged('2026-07-11', { 'item-1': 'sold_out' });

    expect(await findRecord()).toEqual({
      markets: [
        {
          marketId: 'market-1',
          items: [
            {
              itemId: 'item-1',
              bilans: [
                { date: '2026-07-04', outcome: 'did_well' },
                { date: '2026-07-11', outcome: 'sold_out' },
              ],
            },
          ],
        },
      ],
    });
  });

  // Eight is what the streak shows at most, and what a vendor can hold in their head. The
  // window is what bounds the scan; this bounds the payload, and it keeps the *newest*
  // eight, still oldest first.
  it('keeps only the last eight bilans for a dish', async () => {
    for (let week = 1; week <= 10; week++) {
      await judged(`2026-06-${String(week).padStart(2, '0')}`, { 'item-1': 'did_well' });
    }

    const [market] = (await findRecord()).markets;

    expect(market.items[0].bilans.map(bilan => bilan.date)).toEqual([
      '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06',
      '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10',
    ]);
  });

  // Six months, so a weekly market offers ~26 bilans to choose from and a monthly one six.
  // The boundary is the thing worth pinning: without it any window wider than the fixtures
  // passes, and the constant means nothing.
  it('forgets a bilan older than six months', async () => {
    await judged('2026-02-19', { 'item-1': 'did_well' });   // 184 days before today
    await judged('2026-02-21', { 'item-1': 'sold_out' });   // 182 days before today

    const [market] = (await findRecord()).markets;

    expect(market.items[0].bilans).toEqual([{ date: '2026-02-21', outcome: 'sold_out' }]);
  });

  // Three situations reach this state and the handler cannot tell them apart, which is the
  // point: a day called off before it opened, a day still being traded, and a day simply
  // never judged all carry no outcomes. If this ever wants to be three tests, phase logic
  // has crept into a handler that deliberately has none (decision 15).
  it('passes over a day carrying no bilan', async () => {
    await menus.setMenu({ marketId: 'market-1', date: '2026-08-15', itemIds: ['item-1'] }, 'vendor-id');

    expect(await findRecord()).toEqual({ markets: [] });
  });

  // The bilan is set whole but a vendor may answer only some of it, and the dashboard
  // prompt goes on asking until they finish. Until they do, an unanswered dish has nothing
  // to say here.
  it('records only the dishes a partial bilan answered', async () => {
    await menus.setMenu({ marketId: 'market-1', date: '2026-08-15', itemIds: ['item-1', 'item-2'] }, 'vendor-id');
    await menus.recordBilan({ marketId: 'market-1', date: '2026-08-15', outcomes: { 'item-2': 'did_well' } }, 'vendor-id');

    const [market] = (await findRecord()).markets;

    expect(market.items).toEqual([{ itemId: 'item-2', bilans: [{ date: '2026-08-15', outcome: 'did_well' }] }]);
  });

  // A morning market and an evening one are two records, not one blurred together. Looked
  // up rather than indexed: the order markets come back in is incidental (decision 17), and
  // a test that asserts it breaks on a harmless change to the fold.
  it('keeps two markets on the same day apart', async () => {
    await judged('2026-08-15', { 'item-1': 'sold_out' });
    await menus.setMenu({ marketId: 'market-2', date: '2026-08-15', itemIds: ['item-1'] }, 'vendor-id');
    await menus.recordBilan({ marketId: 'market-2', date: '2026-08-15', outcomes: { 'item-1': 'did_not_do_well' } }, 'vendor-id');

    const { markets } = await findRecord();
    const outcomesAt = (marketId: string) =>
      markets.find(market => market.marketId === marketId)?.items[0].bilans.map(bilan => bilan.outcome);

    expect(outcomesAt('market-1')).toEqual(['sold_out']);
    expect(outcomesAt('market-2')).toEqual(['did_not_do_well']);
  });

  // The state every vendor is in until they finish their first bilan, and what the menu
  // editor renders against on day one.
  it('reads an empty set for a vendor who has judged nothing', async () => {
    expect(await findRecord()).toEqual({ markets: [] });
  });
});
