import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DiscoveryModule } from '@nestjs/core';
import {
  CommandDispatcher,
  Events,
  EventStore,
  InMemoryEventStore,
  MessageContext,
  MessageContextEventStore,
} from '@market-monster/event-sourcing';
import { MessageContextModule } from '../message-context/message-context.module';
import { TracingCommandDispatcher } from './tracing.command-dispatcher';
import { ConsumerRunner, POLLING_ENABLED } from './consumer-runner';
import { TracingEventStore } from './tracing.event-store';

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
  imports: [CqrsModule, DiscoveryModule, MessageContextModule],
  providers: [
    ...eventStore,
    TracingCommandDispatcher,
    { provide: CommandDispatcher, useExisting: TracingCommandDispatcher },
    { provide: POLLING_ENABLED, useValue: true },
    ConsumerRunner,
  ],
  exports: [
    EventStore,
    Events,
    InMemoryEventStore,
    CommandDispatcher,
    ConsumerRunner,
  ],
})
export class EventSourcingModule {}
