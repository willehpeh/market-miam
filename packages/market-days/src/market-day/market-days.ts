import { VendorId } from '@market-miam/shared-kernel';
import { Clock } from '@market-miam/common';
import { MarketDay } from './market-day';
import { MarketDayId } from './market-day-id';
import { VendorScopedEvents } from '../vendor-scoped-events';

export class MarketDays {
  constructor(private readonly vendorEvents: VendorScopedEvents,
              private readonly clock: Clock) {
  }

  async forVendorAtMarketOn(vendorId: VendorId, id: MarketDayId): Promise<MarketDay> {
    const events = await this.vendorEvents.load(id.streamIdFor(vendorId));
    return new MarketDay(id, this.clock.today()).rehydrate(events);
  }

  save(marketDay: MarketDay, vendorId: VendorId, id: MarketDayId): Promise<void> {
    return this.vendorEvents.save(id.streamIdFor(vendorId), marketDay, vendorId);
  }
}
