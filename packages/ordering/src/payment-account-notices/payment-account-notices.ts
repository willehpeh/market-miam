import { EventStore } from '@market-miam/event-sourcing';
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

  private recordOnce(streamId: string, detected: PaymentAccountUpdateDetected): Promise<void> {
    return this.store.append(streamId, [detected], 0).catch(async (error: unknown) => {
      if (await this.isRecorded(streamId)) {
        return;
      }
      throw error;
    });
  }

  private async isRecorded(streamId: string): Promise<boolean> {
    return (await this.store.load(streamId)).length > 0;
  }
}
