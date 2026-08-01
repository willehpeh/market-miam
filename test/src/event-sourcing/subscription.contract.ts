import {
  DomainEvent,
  EventHandler,
  EventStore,
  StoredEvent,
  Subscription,
} from '@market-miam/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

export function subscriptionContract(
  implementationName: string,
  createSubject: () => {
    writer: EventStore;
    subscribe: (handler: EventHandler) => Subscription;
  },
): void {
  describe(`Subscription contract: ${implementationName}`, () => {
    let writer: EventStore;
    let subscribe: (handler: EventHandler) => Subscription;

    beforeEach(() => {
      ({ writer, subscribe } = createSubject());
    });

    it('dispatches matching events to the handler in global order', async () => {
      const handler = new RecordingHandler(['First', 'Second']);
      const subscription = subscribe(handler);

      await writer.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);
      await subscription.poll();

      expect(handler.handled.map((e) => e.type)).toEqual(['First', 'Second']);
    });

    it('does not dispatch events whose type the handler does not subscribe to', async () => {
      const handler = new RecordingHandler(['Wanted']);
      const subscription = subscribe(handler);

      await writer.append('stream-1', [dummyEvent('Wanted'), dummyEvent('Ignored')], 0);
      await subscription.poll();

      expect(handler.handled.map((e) => e.type)).toEqual(['Wanted']);
    });

    it('does not redeliver events across successive polls', async () => {
      const handler = new RecordingHandler(['First', 'Second']);
      const subscription = subscribe(handler);

      await writer.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);
      await subscription.poll();
      await subscription.poll();

      expect(handler.handled.map((e) => e.type)).toEqual(['First', 'Second']);
    });

    it('resumes from the checkpoint, delivering only events appended since the last poll', async () => {
      const handler = new RecordingHandler(['First', 'Second', 'Third']);
      const subscription = subscribe(handler);

      await writer.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);
      await subscription.poll();

      await writer.append('stream-1', [dummyEvent('Third')], 2);
      await subscription.poll();

      expect(handler.handled.map((e) => e.type)).toEqual(['First', 'Second', 'Third']);
    });

    it('drains a backlog larger than one batch in a single poll, in order', async () => {
      const handler = new RecordingHandler(['Bulk']);
      const subscription = subscribe(handler);
      const backlog = Array.from({ length: 120 }, () => dummyEvent('Bulk'));

      await writer.append('stream-1', backlog, 0);
      await subscription.poll();

      expect(handler.handled).toHaveLength(120);
      const positions = handler.handled.map((e) => e.globalPosition);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    });

    it('advances past non-matching events, delivering a later matching event', async () => {
      const handler = new RecordingHandler(['Wanted']);
      const subscription = subscribe(handler);

      await writer.append('stream-1', [dummyEvent('Ignored')], 0);
      await subscription.poll();

      await writer.append('stream-1', [dummyEvent('Wanted')], 1);
      await subscription.poll();

      expect(handler.handled.map((e) => e.type)).toEqual(['Wanted']);
    });
  });
}

export class RecordingHandler implements EventHandler {
  readonly handled: StoredEvent[] = [];

  constructor(private readonly types: string[]) {}

  eventTypes(): string[] {
    return this.types;
  }

  handle(event: StoredEvent): void {
    this.handled.push(event);
  }
}

function dummyEvent(type: string): DomainEvent {
  return { type, payload: {}, version: 1 };
}
