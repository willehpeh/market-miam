import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import {
  Events,
  EventStore,
  InMemoryEventStore,
  MessageContext,
  MessageContextDispatcher,
  MessageContextEventStore,
} from '@market-monster/event-sourcing';
import { CommandDispatcher } from './command-dispatcher';
import { TracingEventStore } from './tracing.event-store';

// Generic event-sourcing infrastructure: the message-context plumbing, the
// decorated event store (tracing over context over the in-memory store), the
// global Events read port, and the command dispatcher. No domain knowledge —
// the market-days wiring (repositories, handlers, projections) imports this.
const messageContext = [
  MessageContext,
  {
    provide: MessageContextDispatcher,
    useFactory: (context: MessageContext) =>
      new MessageContextDispatcher(context, () => randomUUID()),
    inject: [MessageContext],
  },
];

const eventStore = [
  InMemoryEventStore,
  {
    provide: MessageContextEventStore,
    useFactory: (inner: InMemoryEventStore, context: MessageContext) =>
      new MessageContextEventStore(inner, context),
    inject: [InMemoryEventStore, MessageContext],
  },
  {
    provide: EventStore,
    useFactory: (inner: MessageContextEventStore) => new TracingEventStore(inner),
    inject: [MessageContextEventStore],
  },
  { provide: Events, useExisting: InMemoryEventStore },
];

@Module({
  imports: [CqrsModule],
  providers: [...messageContext, ...eventStore, CommandDispatcher],
  exports: [
    MessageContext,
    MessageContextDispatcher,
    EventStore,
    Events,
    InMemoryEventStore,
    CommandDispatcher,
  ],
})
export class EventSourcingModule {}
