import { randomUUID } from 'node:crypto';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscoveryModule } from '@nestjs/core';
import {
  CommandDispatcher,
  Events,
  EventStore,
  InMemoryEventStore,
  MessageContext,
  MessageContextDispatcher,
  MessageContextEventStore,
} from '@market-monster/event-sourcing';
import { TracingCommandDispatcher } from './tracing.command-dispatcher';
import { ConsumerRunner, POLLING_ENABLED } from './consumer-runner';
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

const decoratedEventStore = (inner: EventStore, context: MessageContext) =>
  new TracingEventStore(new MessageContextEventStore(inner, context));

const eventStore = [
  InMemoryEventStore,
  {
    provide: EventStore,
    useFactory: decoratedEventStore,
    inject: [InMemoryEventStore, MessageContext],
  },
  { provide: Events, useExisting: InMemoryEventStore },
];

@Module({
  imports: [CqrsModule, DiscoveryModule],
  providers: [
    ...messageContext,
    ...eventStore,
    TracingCommandDispatcher,
    { provide: CommandDispatcher, useExisting: TracingCommandDispatcher },
    { provide: POLLING_ENABLED, useValue: true },
    ConsumerRunner,
  ],
  exports: [
    MessageContext,
    MessageContextDispatcher,
    EventStore,
    Events,
    InMemoryEventStore,
    CommandDispatcher,
    ConsumerRunner,
  ],
})
export class EventSourcingModule {}
