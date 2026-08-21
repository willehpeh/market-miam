import { ConcurrencyError, DomainEvent, EventStore } from '@market-miam/event-sourcing';
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

      await store.append('stream-1', [{ type: 'ItemAddedToCatalogue', payload, version: 1 }], 0);

      expect(await store.load('stream-1')).toEqual([
        expect.objectContaining({ type: 'ItemAddedToCatalogue', payload }),
      ]);
    });

    it('preserves an events schema version through append and load', async () => {
      await store.append('stream-1', [{ type: 'Evolved', payload: {}, version: 2 }], 0);

      const [event] = await store.load('stream-1');

      expect(event.version).toBe(2);
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

    it('assigns a batch the positions expectedStreamPosition + 1 through + batch length', async () => {
      // The position promise ShreddingEventStore seals into its AAD before the
      // store assigns anything — pinned here in the exact shape that exposes
      // both terms: a multi-event batch at a non-zero expected position.
      await store.append('stream-1', [dummyEvent('First')], 0);
      await store.append('stream-1', [dummyEvent('Second'), dummyEvent('Third')], 1);

      const positions = (await store.load('stream-1')).map((e) => e.streamPosition);

      expect(positions).toEqual([1, 2, 3]);
    });

    it('enforces optimistic concurrency, persisting nothing on a stale expected position', async () => {
      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);

      await store.append('stream-1', [dummyEvent('Third')], 2);

      await expect(
        store.append('stream-1', [dummyEvent('Stale')], 2),
      ).rejects.toThrow(ConcurrencyError);

      const types = (await store.load('stream-1')).map((e) => e.type);
      expect(types).toEqual(['First', 'Second', 'Third']);
    });

    it('requires expectedStreamPosition 0 for the first append to a new stream', async () => {
      await expect(
        store.append('stream-1', [dummyEvent('First')], 1),
      ).rejects.toThrow(ConcurrencyError);

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

    it('assigns a globalPosition that increases monotonically in append order across streams', async () => {
      await store.append('stream-1', [dummyEvent('A1')], 0);
      await store.append('stream-2', [dummyEvent('B1')], 0);
      await store.append('stream-1', [dummyEvent('A2')], 1);

      const a = await store.load('stream-1');
      const b = await store.load('stream-2');
      const byAppendOrder = [a[0], b[0], a[1]].map((e) => e.globalPosition);

      expect(byAppendOrder).toEqual([...byAppendOrder].sort((x, y) => x - y));
      expect(new Set(byAppendOrder).size).toBe(3);
    });

    it('attaches supplied metadata to every event in the batch', async () => {
      const metadata = { vendorId: 'vendor-1', correlationId: 'corr-1' };

      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0, metadata);

      expect(await store.load('stream-1')).toEqual([
        expect.objectContaining({ type: 'First', metadata }),
        expect.objectContaining({ type: 'Second', metadata }),
      ]);
    });

    it('returns events without metadata when none is supplied', async () => {
      await store.append('stream-1', [dummyEvent('First')], 0);

      const [event] = await store.load('stream-1');

      expect(event).not.toHaveProperty('metadata');
    });

    it('carries independent metadata per append on the same stream', async () => {
      await store.append('stream-1', [dummyEvent('First')], 0, { correlationId: 'corr-1' });
      await store.append('stream-1', [dummyEvent('Second')], 1, { correlationId: 'corr-2' });

      expect(await store.load('stream-1')).toEqual([
        expect.objectContaining({ type: 'First', metadata: { correlationId: 'corr-1' } }),
        expect.objectContaining({ type: 'Second', metadata: { correlationId: 'corr-2' } }),
      ]);
    });

    // Milliseconds, not seconds: the only reader subtracts this from a consumer's
    // Date.now() (processing.lag_ms), so a unit mismatch would not fail loudly — it
    // would report a lag ~1000x too large. Bounded against the wall clock rather than
    // merely typed, because the type alone cannot tell the units apart; a seconds
    // value lands in 1970 and misses this window by decades.
    // The window is deliberately wide. PostgresEventStore stamps from the database
    // clock precisely so the measurement does not depend on the appending process's
    // clock — a containerised Postgres was observed ~11ms ahead of its host — so a
    // tight bound would assert clock agreement, which is the thing being avoided.
    it('stamps every appended event with a millisecond-epoch timestamp', async () => {
      const skewToleranceMs = 60_000;
      const before = Date.now();

      await store.append('stream-1', [dummyEvent('First'), dummyEvent('Second')], 0);

      const timestamps = (await store.load('stream-1')).map((e) => e.timestamp);
      expect(timestamps).toHaveLength(2);
      for (const timestamp of timestamps) {
        expect(timestamp).toBeGreaterThanOrEqual(before - skewToleranceMs);
        expect(timestamp).toBeLessThanOrEqual(Date.now() + skewToleranceMs);
      }
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
  return { type, payload: {}, version: 1 };
}
