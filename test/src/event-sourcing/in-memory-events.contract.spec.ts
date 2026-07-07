import { eventsContract } from './events.contract';
import { InMemoryEventStore } from '@market-miam/event-sourcing';

eventsContract('InMemoryEventStore', () => {
  const store = new InMemoryEventStore();
  return { writer: store, events: store };
});
