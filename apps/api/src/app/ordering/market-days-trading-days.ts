import { Injectable } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindLiveMarketDay } from '@market-miam/market-days';
import { NoTradingDay, ScheduledTradingDay, TradingDay, TradingDays } from '@market-miam/ordering';
import { VendorId } from '@market-miam/shared-kernel';

const ENDED_PHASES = ['over', 'past'];

@Injectable()
export class MarketDaysTradingDays extends TradingDays {
  constructor(private readonly queries: QueryGateway) {
    super();
  }

  async forVendorAtMarketOn(vendorId: VendorId, marketId: string, date: string): Promise<TradingDay> {
    const liveDay = await this.queries.execute(new FindLiveMarketDay(vendorId.value(), marketId, date));
    if (!liveDay) {
      return new NoTradingDay();
    }
    return new ScheduledTradingDay({
      menuDishIds: liveDay.itemIds,
      soldOutDishIds: liveDay.soldOutItemIds,
      closed: liveDay.closed,
      ended: ENDED_PHASES.includes(liveDay.phase),
      pricing: {},
    });
  }
}
