import { EventStore } from '@market-miam/event-sourcing';
import { PaymentAccountUpdateDetected } from './events';

export class PaymentAccountNotices {
  constructor(private readonly store: EventStore) {}

  async recordUpdate(noticeId: string, accountId: string): Promise<void> {
    const detected: PaymentAccountUpdateDetected = {
      type: 'PaymentAccountUpdateDetected',
      payload: { noticeId, accountId },
      version: 1,
    };
    await this.store.append(`ordering-payment-account-notice-${noticeId}`, [detected], 0);
  }
}
