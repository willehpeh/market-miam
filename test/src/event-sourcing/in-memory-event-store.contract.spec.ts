import { eventStoreContract } from './event-store.contract';
import { InMemoryEventStore } from '@market-miam/event-sourcing';

eventStoreContract('InMemoryEventStore', () => new InMemoryEventStore());
