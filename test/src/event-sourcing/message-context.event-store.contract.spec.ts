import { eventStoreContract } from './event-store.contract';
import {
  InMemoryEventStore,
  MessageContext,
  MessageContextEventStore,
} from '@market-miam/event-sourcing';

// The context-stamping decorator must remain a faithful EventStore: outside a
// dispatch it has no context to add, so it upholds the full contract — including
// load, and adding no metadata when none is supplied. Its context-merge
// behaviour during a dispatch is covered in message-context.spec.ts.
eventStoreContract(
  'MessageContextEventStore',
  () => new MessageContextEventStore(new InMemoryEventStore(), new MessageContext()),
);
