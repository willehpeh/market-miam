import { DomainEvent, EventStore } from '@market-monster/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

/**
 * Behavioural contract for the EventStore port. Run it against any
 * implementation by passing a factory:
 *
 *   eventStoreContract('InMemoryEventStore', () => new InMemoryEventStore());
 *
 * Uses port methods only (append/load) so every implementation is held to the
 * same behaviour. Lives in a `.contract.ts` (not `.spec.ts`) file so Vitest
 * does not run it standalone.
 */
export function eventStoreContract(
  implementationName: string,
  createStore: () => EventStore,
): void {
  describe(`EventStore contract: ${implementationName}`, () => {
    let store: EventStore;

    beforeEach(() => {
      store = createStore();
    });

    it('assigns a unique id to every appended event', async () => {
      await store.append(
        'stream-1',
        [event('FirstHappened'), event('SecondHappened')],
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
        [event('FirstHappened'), event('SecondHappened')],
        0,
      );

      const firstLoad = (await store.load('stream-1')).map((e) => e.id);
      const secondLoad = (await store.load('stream-1')).map((e) => e.id);

      expect(secondLoad).toEqual(firstLoad);
    });
  });
}

function event(type: string): DomainEvent {
  return { type, payload: {} };
}
