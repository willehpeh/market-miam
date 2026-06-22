import { eventsContract } from './events.contract';
import { InMemoryEventStore } from '../in-memory.event-store';

eventsContract('InMemoryEventStore', () => {
  const store = new InMemoryEventStore();
  return { writer: store, events: store };
});
