import { ConcurrencyError, EventStore } from '@market-miam/event-sourcing';
import { PaymentAccountUpdateDetected } from './events';

export type Notice = PaymentAccountUpdateDetected['payload'];

export class PaymentAccountNotices {
  constructor(private readonly store: EventStore) {}

  async recordUpdate({ noticeId, accountId }: Notice): Promise<void> {
    await this.recordOnce(`ordering-payment-account-notice-${noticeId}`, {
      type: 'PaymentAccountUpdateDetected',
      payload: { noticeId, accountId },
      version: 1,
    });
  }

  private async recordOnce(streamId: string, notice: PaymentAccountUpdateDetected): Promise<void> {
    try {
      await this.store.append(streamId, [notice], 0);
    } catch (error) {
      if (!(error instanceof ConcurrencyError)) {
        throw error;
      }
    }
  }
}
