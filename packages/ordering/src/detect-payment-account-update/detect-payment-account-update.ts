import { Command } from '@nestjs/cqrs';

export class DetectPaymentAccountUpdate extends Command<void> {
  constructor(
    readonly noticeId: string,
    readonly accountId: string,
  ) { super(); }
}
