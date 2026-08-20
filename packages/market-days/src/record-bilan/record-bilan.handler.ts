import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { RecordBilan } from './record-bilan';
import { ItemOutcomes, MarketDayId, MarketDays } from '../market-day';
import { parisTime } from '../market-schedule-view';

@CommandHandler(RecordBilan)
export class RecordBilanHandler implements ICommandHandler<RecordBilan> {

  constructor(private readonly marketDays: MarketDays,
              private readonly clock: Clock) {}

  async execute(command: RecordBilan): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const id = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));

    const marketDay = await this.marketDays.forVendorAtMarketOn(vendorId, id);
    marketDay.recordBilan(new ItemOutcomes(command.outcomes), parisTime(this.clock.now()));

    await this.marketDays.save(marketDay, vendorId);
  }
}
