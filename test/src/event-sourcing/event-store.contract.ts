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

    it('preserves append order within a stream', async () => {
      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);
      await store.append('stream-1', [dummyEvent('Third')], 2);

      const types = (await store.load('stream-1')).map((e) => e.type);

      expect(types).toEqual(['First', 'Second', 'Third']);
    });

    it('assigns a 1-based streamPosition that increments within a stream', async () => {
      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);
      await store.append('stream-1', [dummyEvent('Third')], 2);

      const positions = (await store.load('stream-1')).map((e) => e.streamPosition);

      expect(positions).toEqual([1, 2, 3]);
    });

    it('enforces optimistic concurrency, persisting nothing on a stale expected position', async () => {
      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);

      await store.append('stream-1', [dummyEvent('Third')], 2);

      await expect(
        store.append('stream-1', [dummyEvent('Stale')], 2),
      ).rejects.toThrow();

      const types = (await store.load('stream-1')).map((e) => e.type);
      expect(types).toEqual(['First', 'Second', 'Third']);
    });

    it('requires expectedStreamPosition 0 for the first append to a new stream', async () => {
      await expect(
        store.append('stream-1', [dummyEvent('First')], 1),
      ).rejects.toThrow();

      await store.append('stream-2', [dummyEvent('First')], 0);
      expect(await store.load('stream-2')).toHaveLength(1);
    });

    it('loads only the requested streams events, never another streams', async () => {
      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);
      await store.append('stream-2', [dummyEvent('Other')], 0);

      const streamOneTypes = (await store.load('stream-1')).map((e) => e.type);
      const streamTwoTypes = (await store.load('stream-2')).map((e) => e.type);

      expect(streamOneTypes).toEqual(['First', 'Second']);
      expect(streamTwoTypes).toEqual(['Other']);
    });

    it('numbers streamPosition independently per stream', async () => {
      await store.append('stream-1', [dummyEvent('A1')], 0);
      await store.append('stream-2', [dummyEvent('B1'), dummyEvent('B2')], 0);
      await store.append('stream-1', [dummyEvent('A2')], 1);

      const streamOne = (await store.load('stream-1')).map((e) => e.streamPosition);
      const streamTwo = (await store.load('stream-2')).map((e) => e.streamPosition);

      expect(streamOne).toEqual([1, 2]);
      expect(streamTwo).toEqual([1, 2]);
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
