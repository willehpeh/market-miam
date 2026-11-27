import { Injectable } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindLiveMarketDay, LiveDish } from '@market-miam/market-days';
import {
  DishPricing,
  FlatPricing,
  NoTradingDay,
  ScheduledTradingDay,
  TradingDay,
  TradingDays,
  VariantPricing,
} from '@market-miam/ordering';
import { VendorId } from '@market-miam/shared-kernel';

const NOT_YET_OPEN_PHASES = ['due', 'future'];
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
      menuDishIds: liveDay.dishes.map(dish => dish.itemId),
      soldOutDishIds: liveDay.dishes.filter(dish => dish.soldOut).map(dish => dish.itemId),
      closed: liveDay.closed,
      opened: !NOT_YET_OPEN_PHASES.includes(liveDay.phase),
      ended: ENDED_PHASES.includes(liveDay.phase),
      pricing: Object.fromEntries(liveDay.dishes.map(dish => [dish.itemId, this.pricingOf(dish)])),
    });
  }

  private pricingOf({ price, variants = [] }: LiveDish): DishPricing {
    return price === undefined
      ? new VariantPricing(Object.fromEntries(variants.map(variant => [variant.name, variant.price])))
      : new FlatPricing(price);
  }
}
