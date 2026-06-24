import { DomainEvent, Events, EventStore } from '@market-monster/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

const PAGE = 100;

export function eventsContract(
  implementationName: string,
  createSubject: () => { writer: EventStore; events: Events },
): void {
  describe(`Events contract: ${implementationName}`, () => {
    let writer: EventStore;
    let events: Events;

    beforeEach(() => {
      ({ writer, events } = createSubject());
    });

    it('loadFrom(0) returns all events across streams in global order', async () => {
      await writer.append('stream-1', [dummyEvent('A1')], 0);
      await writer.append('stream-2', [dummyEvent('B1')], 0);
      await writer.append('stream-1', [dummyEvent('A2')], 1);

      const types = (await events.loadFrom(0, PAGE)).map((e) => e.type);

      expect(types).toEqual(['A1', 'B1', 'A2']);
    });

    it('loadFrom excludes events at or below the given position', async () => {
      await writer.append(
        'stream-1',
        [dummyEvent('First'), dummyEvent('Second'), dummyEvent('Third')],
        0,
      );

      const all = await events.loadFrom(0, PAGE);
      const secondPosition = all[1].globalPosition;

      const after = (await events.loadFrom(secondPosition, PAGE)).map((e) => e.type);

      expect(after).toEqual(['Third']);
    });

    it('loadFrom returns an empty array when no events lie beyond the position', async () => {
      expect(await events.loadFrom(0, PAGE)).toEqual([]);

      await writer.append('stream-1', [dummyEvent('First')], 0);
      const all = await events.loadFrom(0, PAGE);
      const lastPosition = all[all.length - 1].globalPosition;

      expect(await events.loadFrom(lastPosition, PAGE)).toEqual([]);
    });

    it('loadFrom returns at most `limit` events from the position', async () => {
      await writer.append(
        'stream-1',
        [dummyEvent('First'), dummyEvent('Second'), dummyEvent('Third')],
        0,
      );

      const firstTwo = (await events.loadFrom(0, 2)).map((e) => e.type);

      expect(firstTwo).toEqual(['First', 'Second']);
    });
  });
}

function dummyEvent(type: string): DomainEvent {
  return { type, payload: {} };
}
