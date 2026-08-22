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
});
