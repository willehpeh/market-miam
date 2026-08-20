import { Command } from '@nestjs/cqrs';
import { ItemOutcome } from '../market-day';

// No time field, like the availability pair: the bilan is stamped on arrival from the
// server's Clock (decision 35).
export class RecordItemOutcome extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly itemId: string,
    readonly marketId: string,
    readonly date: string,
    readonly outcome: ItemOutcome,
  ) { super(); }
}
