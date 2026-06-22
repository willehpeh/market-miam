import { eventStoreContract } from './event-store.contract';
import { InMemoryEventStore } from '../in-memory.event-store';

eventStoreContract('InMemoryEventStore', () => new InMemoryEventStore());
