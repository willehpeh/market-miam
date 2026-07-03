import { describe, it, expect } from 'vitest';
import { RecordingHandler, subscriptionContract } from './subscription.contract';
import {
  InMemoryCheckpoint,
  InMemoryEventStore,
  InMemorySubscription,
} from '@market-monster/event-sourcing';

subscriptionContract('InMemorySubscription', () => {
  const store = new InMemoryEventStore();
  return {
    writer: store,
    subscribe: (handler) =>
      new InMemorySubscription(store, handler, new InMemoryCheckpoint('sub-1')),
  };
});

describe('InMemorySubscription checkpoint advancement', () => {
  it('advances the checkpoint past a non-matching event', async () => {
    const store = new InMemoryEventStore();
    const checkpoint = new InMemoryCheckpoint('sub-1');
    const subscription = new InMemorySubscription(
      store,
      new RecordingHandler(['Wanted']),
      checkpoint,
    );

    await store.append('stream-1', [{ type: 'Ignored', payload: {}, version: 1 }], 0);
    await subscription.poll();

    const [ignored] = await store.load('stream-1');
    expect(await checkpoint.read()).toBe(ignored.globalPosition);
  });
});
