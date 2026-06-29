import { describe, expect, it } from 'vitest';
import {
  CheckpointedProcessor,
  CheckpointedProjection,
  checkpointMetadata,
  Processor,
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

  it('stamps the name and projection kind on a decorated class', () => {
    @CheckpointedProjection('storefront')
    class StorefrontProjection implements Projection {
      eventTypes(): string[] {
        return [];
      }

      handle(): Promise<void> {
        return Promise.resolve();
      }
    }

    expect(checkpointMetadata(StorefrontProjection)).toEqual({ name: 'storefront', kind: 'projection' });
  });

  it('reports no checkpoint for an undecorated class', () => {
    class UndecoratedHandler {}

    expect(projectionCheckpoint(UndecoratedHandler)).toBeUndefined();
  });
});

describe('@CheckpointedProcessor', () => {
  it('stamps the name and processor kind on a decorated class', () => {
    @CheckpointedProcessor('storefront-opener')
    class StorefrontOpener implements Processor {
      eventTypes(): string[] {
        return [];
      }

      handle(): Promise<void> {
        return Promise.resolve();
      }
    }

    expect(checkpointMetadata(StorefrontOpener)).toEqual({ name: 'storefront-opener', kind: 'processor' });
  });
});
