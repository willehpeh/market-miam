import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { MarketId, VendorId } from '@market-miam/shared-kernel';
import { Clock, LocalDate } from '@market-miam/common';
import { RecordItemOutcome } from './record-item-outcome';
import { MarketDayId, MarketDays } from '../market-day';
import { ItemId } from '../catalogue';
import { parisTime } from '../market-schedule-view';

@CommandHandler(RecordItemOutcome)
export class RecordItemOutcomeHandler implements ICommandHandler<RecordItemOutcome> {

  constructor(private readonly marketDays: MarketDays,
              private readonly clock: Clock) {}

  async execute(command: RecordItemOutcome): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const id = new MarketDayId(new MarketId(command.marketId), new LocalDate(command.date));
    const itemId = new ItemId(command.itemId);

    const marketDay = await this.marketDays.forVendorAtMarketOn(vendorId, id);
    marketDay.recordItemOutcome(itemId, command.outcome, parisTime(this.clock.now()));

    await this.marketDays.save(marketDay, vendorId);
  }
}
