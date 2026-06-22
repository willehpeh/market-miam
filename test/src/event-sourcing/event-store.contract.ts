import { DomainEvent, EventStore } from '@market-monster/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

export function eventStoreContract(
  implementationName: string,
  createStore: () => EventStore,
): void {
  describe(`EventStore contract: ${implementationName}`, () => {
    let store: EventStore;

    beforeEach(() => {
      store = createStore();
    });

    it('loads an empty array for a stream that has never been appended to', async () => {
      expect(await store.load('never-touched')).toEqual([]);
    });

    it('round-trips event type and payload faithfully', async () => {
      const payload = {
        itemId: 'item-1',
        price: { amount: 500, currency: 'EUR' },
        tags: ['fresh', 'local'],
      };

      await store.append('stream-1', [{ type: 'ItemAddedToCatalogue', payload }], 0);

      expect(await store.load('stream-1')).toEqual([
        expect.objectContaining({ type: 'ItemAddedToCatalogue', payload }),
      ]);
    });

    it('assigns a unique id to every appended event', async () => {
      await store.append(
        'stream-1',
        [dummyEvent('FirstHappened'), dummyEvent('SecondHappened')],
        0,
      );

      const ids = (await store.load('stream-1')).map((e) => e.id);

      expect(ids).toHaveLength(2);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(
        true,
      );
      expect(new Set(ids).size).toBe(2);
    });

    it('returns the same id for an event on subsequent loads', async () => {
      await store.append(
        'stream-1',
        [dummyEvent('FirstHappened'), dummyEvent('SecondHappened')],
        0,
      );

      const firstLoad = (await store.load('stream-1')).map((e) => e.id);
      const secondLoad = (await store.load('stream-1')).map((e) => e.id);

      expect(secondLoad).toEqual(firstLoad);
    });

    it('assigns ids that are unique across streams and separate appends', async () => {
      await store.append('stream-1', [dummyEvent('FirstHappened'), dummyEvent('SecondHappened')], 0);
      await store.append('stream-2', [dummyEvent('ThirdHappened')], 0);
      await store.append('stream-1', [dummyEvent('FourthHappened')], 2);

      const ids = [
        ...(await store.load('stream-1')),
        ...(await store.load('stream-2')),
      ].map((e) => e.id);

      expect(ids).toHaveLength(4);
      expect(new Set(ids).size).toBe(4);
    });
  });
}

function dummyEvent(type: string): DomainEvent {
  return { type, payload: {} };
}
