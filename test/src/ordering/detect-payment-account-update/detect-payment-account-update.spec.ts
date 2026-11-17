import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { DetectPaymentAccountUpdateHandler, PaymentAccountNotices } from '@market-miam/ordering';
import { noticeStream, updateDetected } from '../notice-events';
import { TestDetectPaymentAccountUpdate } from './test-data';

describe('Detect Payment Account Update', () => {
  let store: InMemoryEventStore;
  let handler: DetectPaymentAccountUpdateHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    handler = new DetectPaymentAccountUpdateHandler(new PaymentAccountNotices(store));
  });

  const given = (...history: DomainEvent[]): void => store.seedWith(noticeStream(), history);

  it('records the update a notice reports, on a stream named after the notice', async () => {
    await handler.execute(TestDetectPaymentAccountUpdate.valid());

    expect(store.newEvents()).toEqual([expect.objectContaining({ streamId: noticeStream(), ...updateDetected() })]);
  });

  it('records nothing when Stripe sends the same notice again', async () => {
    given(updateDetected());

    await handler.execute(TestDetectPaymentAccountUpdate.valid());

    expect(store.newEvents()).toEqual([]);
  });
});
