import { Injectable } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindLiveMarketDay, LiveDish } from '@market-miam/market-days';
import {
  DishOnMenu,
  DishOnSale,
  DishPricing,
  FlatPricing,
  NoTradingDay,
  ScheduledTradingDay,
  SoldOutDish,
  TradingDay,
  TradingDays,
  VariantPricing,
} from '@market-miam/ordering';
import { VendorId } from '@market-miam/shared-kernel';

const NOT_YET_OPEN_PHASES = ['due', 'future'];
const ENDED_PHASES = ['over', 'past'];

@Injectable()
export class MarketDaysTradingDays implements TradingDays {
  constructor(private readonly queries: QueryGateway) {}

  async forVendorAtMarketOn(vendorId: VendorId, marketId: string, date: string): Promise<TradingDay> {
    const liveDay = await this.queries.execute(new FindLiveMarketDay(vendorId.value(), marketId, date));
    if (!liveDay) {
      return new NoTradingDay();
    }
    return new ScheduledTradingDay({
      closed: liveDay.closed,
      opened: !NOT_YET_OPEN_PHASES.includes(liveDay.phase),
      ended: ENDED_PHASES.includes(liveDay.phase),
      menu: new Map(liveDay.dishes.map(dish => [dish.itemId, this.dishOnMenu(dish)])),
    });
  }

  private dishOnMenu(dish: LiveDish): DishOnMenu {
    return dish.soldOut ? new SoldOutDish() : new DishOnSale(this.pricingOf(dish));
  }

  private pricingOf({ price, variants = [] }: LiveDish): DishPricing {
    return price === undefined
      ? new VariantPricing(Object.fromEntries(variants.map(variant => [variant.name, variant.price])))
      : new FlatPricing(price);
  }
}
