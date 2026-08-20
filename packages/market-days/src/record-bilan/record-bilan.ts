import { Command } from '@nestjs/cqrs';
import { ItemOutcome } from '../market-day';

// The whole reckoning in one command, replacing what stood before it (decision 72). No time
// field: the handler stamps from the server's Clock to decide whether the day is finished,
// and the store times the event it writes.
export class RecordBilan extends Command<void> {
  constructor(
    readonly vendorId: string,
    readonly marketId: string,
    readonly date: string,
    readonly outcomes: Record<string, ItemOutcome>,
  ) { super(); }
}
