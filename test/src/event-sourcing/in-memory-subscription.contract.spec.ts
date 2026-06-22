import { subscriptionContract } from './subscription.contract';
import { InMemoryEventStore } from '../in-memory.event-store';
import { InMemorySubscription } from '../in-memory.subscription';

subscriptionContract('InMemorySubscription', () => {
  const store = new InMemoryEventStore();
  return {
    writer: store,
    subscribe: (handler) => new InMemorySubscription('sub-1', store, handler),
  };
});
