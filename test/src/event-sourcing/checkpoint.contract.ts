import { Checkpoint, CheckpointConflictError } from '@market-miam/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

export function checkpointContract(
  implementationName: string,
  createCheckpoint: (name: string) => Checkpoint,
): void {
  describe(`Checkpoint contract: ${implementationName}`, () => {
    let checkpoint: Checkpoint;

    beforeEach(() => {
      checkpoint = createCheckpoint('cp-1');
    });

    it('reads 0 before any position is written', async () => {
      expect(await checkpoint.read()).toBe(0);
    });

    it('reads back the last advanced position', async () => {
      await checkpoint.advance(0, 5);
      await checkpoint.advance(5, 8);

      expect(await checkpoint.read()).toBe(8);
    });

    it('keeps positions isolated per subscription name', async () => {
      const other = createCheckpoint('cp-2');
      await checkpoint.advance(0, 5);

      expect(await other.read()).toBe(0);
    });

    it('rejects an advance from a stale position and leaves the position untouched', async () => {
      await checkpoint.advance(0, 5);

      await expect(checkpoint.advance(0, 3)).rejects.toBeInstanceOf(CheckpointConflictError);
      expect(await checkpoint.read()).toBe(5);
    });

    it('rejects a first advance that does not start from 0', async () => {
      await expect(checkpoint.advance(3, 4)).rejects.toBeInstanceOf(CheckpointConflictError);
      expect(await checkpoint.read()).toBe(0);
    });

    it('reset returns the position to 0', async () => {
      await checkpoint.advance(0, 8);
      await checkpoint.reset();

      expect(await checkpoint.read()).toBe(0);
    });

    it('reset before any advance leaves the position at 0', async () => {
      await checkpoint.reset();

      expect(await checkpoint.read()).toBe(0);
    });

    // The W3 fence: a writer that read its position before a reset cannot move
    // the checkpoint afterwards — its stale batch is rejected, so a rebuild's
    // replay from 0 can never be silently skipped past.
    it('rejects an advance from a pre-reset position', async () => {
      await checkpoint.advance(0, 8);
      await checkpoint.reset();

      await expect(checkpoint.advance(8, 9)).rejects.toBeInstanceOf(CheckpointConflictError);
      expect(await checkpoint.read()).toBe(0);
    });
  });
}
