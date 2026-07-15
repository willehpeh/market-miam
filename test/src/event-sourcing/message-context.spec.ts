import { describe, expect, it } from 'vitest';
import {
  InMemoryEventStore,
  MessageContext,
  MessageContextDispatcher,
  MessageContextEventStore
} from '@market-miam/event-sourcing';

describe('Message context propagation', () => {
  it('stamps one root id as both correlationId and causationId onto events appended during a root dispatch', async () => {
    const ids = stubIds(['root-1']);
    const store = new InMemoryEventStore();
    const context = new MessageContext();
    const contextualStore = new MessageContextEventStore(store, context);
    const dispatcher = new MessageContextDispatcher(context, ids);

    await dispatcher.dispatch(async () => {
      await contextualStore.append(
        'stream-1',
        [{ type: 'First', payload: {}, version: 1 }],
        0,
        { vendorId: 'v1' },
      );
    });

    expect(await store.load('stream-1')).toEqual([
      expect.objectContaining({
        metadata: { vendorId: 'v1', correlationId: 'root-1', causationId: 'root-1' },
      }),
    ]);
  });
});

function stubIds(ids: string[]): () => string {
  const queue = [...ids];
  return () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error('stubIds exhausted');
    }
    return next;
  };
}
