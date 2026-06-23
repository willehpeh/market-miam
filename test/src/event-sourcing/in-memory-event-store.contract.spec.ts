import { eventStoreContract } from './event-store.contract';
import { InMemoryEventStore } from '@market-monster/event-sourcing';

eventStoreContract('InMemoryEventStore', () => new InMemoryEventStore());
