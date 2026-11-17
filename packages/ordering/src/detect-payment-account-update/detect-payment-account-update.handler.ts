import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PaymentAccountNotices } from '../payment-account-notices';
import { DetectPaymentAccountUpdate } from './detect-payment-account-update';

@CommandHandler(DetectPaymentAccountUpdate)
export class DetectPaymentAccountUpdateHandler implements ICommandHandler<DetectPaymentAccountUpdate> {
  constructor(private readonly notices: PaymentAccountNotices) {}

  async execute({ noticeId, accountId }: DetectPaymentAccountUpdate): Promise<void> {
    await this.notices.recordUpdate(noticeId, accountId);
  }
}
