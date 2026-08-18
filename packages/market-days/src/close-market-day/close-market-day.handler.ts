import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CloseMarketDay } from './close-market-day';
import { MarketDayId, MarketDays } from '../market-day';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { parisTime } from '../market-schedule-view';

@CommandHandler(CloseMarketDay)
export class CloseMarketDayHandler implements ICommandHandler<CloseMarketDay> {

  constructor(private readonly marketDays: MarketDays,
              private readonly clock: Clock) {}

  async execute(command: CloseMarketDay): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const id = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));

    const marketDay = await this.marketDays.forVendorAtMarketOn(vendorId, id);
    marketDay.close(parisTime(this.clock.now()));

    await this.marketDays.save(marketDay, vendorId);
  }
}
