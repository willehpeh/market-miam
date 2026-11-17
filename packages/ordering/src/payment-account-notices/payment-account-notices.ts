import { ConcurrencyError, EventStore } from '@market-miam/event-sourcing';
import { PaymentAccountUpdateDetected } from './events';

export type Notice = PaymentAccountUpdateDetected['payload'];

export class PaymentAccountNotices {
  constructor(private readonly store: EventStore) {}

  async recordUpdate({ noticeId, accountId }: Notice): Promise<void> {
    const detected: PaymentAccountUpdateDetected = {
      type: 'PaymentAccountUpdateDetected',
      payload: { noticeId, accountId },
      version: 1,
    };
    try {
      await this.store.append(`ordering-payment-account-notice-${noticeId}`, [detected], 0);
    } catch (error) {
      if (!(error instanceof ConcurrencyError)) {
        throw error;
      }
    }
  }
}
