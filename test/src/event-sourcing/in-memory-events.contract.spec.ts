import { eventsContract } from './events.contract';
import { InMemoryEventStore } from '@market-monster/event-sourcing';

eventsContract('InMemoryEventStore', () => {
  const store = new InMemoryEventStore();
  return { writer: store, events: store };
});
