import { describe, expect, it } from 'vitest';
import {
  CheckpointedProjection,
  Projection,
  projectionCheckpoint,
} from '@market-monster/event-sourcing';

// Pins the decorator's contract at the package boundary, independent of the
// consumer-runner discovery that exercises it in the app's outer loop — that
// wiring could refactor away from the decorator and silently orphan it.
describe('@CheckpointedProjection', () => {
  it('exposes the checkpoint name stamped on a decorated class', () => {
    @CheckpointedProjection('storefront')
    class StorefrontProjection implements Projection {
      eventTypes(): string[] {
        return [];
      }

      handle(): Promise<void> {
        return Promise.resolve();
      }
    }

    expect(projectionCheckpoint(StorefrontProjection)).toBe('storefront');
  });

  it('reports no checkpoint for an undecorated class', () => {
    class UndecoratedHandler {}

    expect(projectionCheckpoint(UndecoratedHandler)).toBeUndefined();
  });
});
