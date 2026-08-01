import { describe, expect, it } from 'vitest';
import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';

// seedWith is an in-memory-only test affordance (not on any port), so its
// fidelity invariants are pinned here rather than in the shared contracts:
// however seeding and appending interleave, the fake must behave like a store
// Postgres could be — one global order, one position sequence, max-based head.
describe('InMemoryEventStore seeding fidelity', () => {
  it('keeps loadFrom in ascending global order when seeding follows an append', async () => {
    const store = new InMemoryEventStore();
    await store.append('appended-stream', [event('Appended')], 0);
    store.seedWith('seeded-stream', [event('Seeded')]);

    const loaded = await store.loadFrom(0, 100);
    const positions = loaded.map((e) => e.globalPosition);

    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(new Set(positions).size).toBe(positions.length);
  });

  it('reports a head at or above every position loadFrom has returned', async () => {
    const store = new InMemoryEventStore();
    await store.append('appended-stream', [event('Appended')], 0);
    store.seedWith('seeded-stream', [event('Seeded')]);

    const positions = (await store.loadFrom(0, 100)).map((e) => e.globalPosition);

    expect(await store.head()).toBe(Math.max(...positions));
  });

  it('shares one global position sequence between seeded and appended events', async () => {
    const store = new InMemoryEventStore();
    store.seedWith('seeded-stream', [event('SeededFirst')]);
    await store.append('appended-stream', [event('Appended')], 0);
    store.seedWith('seeded-stream', [event('SeededLast')]);

    const positions = (await store.loadFrom(0, 100)).map((e) => e.globalPosition);

    expect(positions).toEqual([1, 2, 3]);
  });

  it('continues a streams streamPosition across interleaved seed and append', async () => {
    const store = new InMemoryEventStore();
    store.seedWith('stream-1', [event('SeededFirst')]);
    await store.append('stream-1', [event('Appended')], 1);
    store.seedWith('stream-1', [event('SeededLast')]);

    const positions = (await store.load('stream-1')).map((e) => e.streamPosition);

    expect(positions).toEqual([1, 2, 3]);
  });

  it('keeps newEvents and lastEvent scoped to appended events across interleaved seeding', async () => {
    const store = new InMemoryEventStore();
    store.seedWith('stream-1', [event('SeededFirst')]);
    await store.append('stream-1', [event('Appended')], 1);
    store.seedWith('stream-1', [event('SeededLast')]);

    expect(store.newEvents().map((e) => e.type)).toEqual(['Appended']);
    expect(store.lastEvent().type).toBe('Appended');
  });
});

function event(type: string): DomainEvent {
  return { type, payload: {}, version: 1 };
}
