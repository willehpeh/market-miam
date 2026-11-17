import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { DetectPaymentAccountUpdateHandler, PaymentAccountNotices } from '@market-miam/ordering';
import { noticeStream, updateDetected } from '../notice-events';
import { TestDetectPaymentAccountUpdate } from './test-data';

class UnreachableEventStore extends InMemoryEventStore {
  override append(): Promise<void> {
    return Promise.reject(new Error('connection refused'));
  }
}

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

  it('lets a failure to record the notice through, so Stripe sends it again', async () => {
    const unreachable = new DetectPaymentAccountUpdateHandler(new PaymentAccountNotices(new UnreachableEventStore()));

    await expect(unreachable.execute(TestDetectPaymentAccountUpdate.valid())).rejects.toThrow('connection refused');
  });
});
