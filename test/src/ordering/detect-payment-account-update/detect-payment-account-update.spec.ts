import { InMemoryEventStore } from '@market-miam/event-sourcing';
import {
  DetectPaymentAccountUpdate,
  DetectPaymentAccountUpdateHandler,
  PaymentAccountNotices,
} from '@market-miam/ordering';

describe('Detect Payment Account Update', () => {
  let store: InMemoryEventStore;
  let handler: DetectPaymentAccountUpdateHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new DetectPaymentAccountUpdateHandler(new PaymentAccountNotices(store));
  });

  it('records the update a notice reports, on a stream named after the notice', async () => {
    await handler.execute(new DetectPaymentAccountUpdate('evt_test_1', 'acct_test_1'));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        streamId: 'ordering-payment-account-notice-evt_test_1',
        type: 'PaymentAccountUpdateDetected',
        payload: { noticeId: 'evt_test_1', accountId: 'acct_test_1' },
      }),
    ]);
  });
});
