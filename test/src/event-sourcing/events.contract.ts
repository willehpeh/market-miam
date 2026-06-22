import { DomainEvent, Events, EventStore } from '@market-monster/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

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

      const types = (await events.loadFrom(0)).map((e) => e.type);

      expect(types).toEqual(['A1', 'B1', 'A2']);
    });

    it('loadFrom excludes events at or below the given position', async () => {
      await writer.append(
        'stream-1',
        [dummyEvent('First'), dummyEvent('Second'), dummyEvent('Third')],
        0,
      );

      const all = await events.loadFrom(0);
      const secondPosition = all[1].globalPosition;

      const after = (await events.loadFrom(secondPosition)).map((e) => e.type);

      expect(after).toEqual(['Third']);
    });

    it('loadFrom returns an empty array when no events lie beyond the position', async () => {
      expect(await events.loadFrom(0)).toEqual([]);

      await writer.append('stream-1', [dummyEvent('First')], 0);
      const all = await events.loadFrom(0);
      const lastPosition = all[all.length - 1].globalPosition;

      expect(await events.loadFrom(lastPosition)).toEqual([]);
    });
  });
}

function dummyEvent(type: string): DomainEvent {
  return { type, payload: {} };
}
