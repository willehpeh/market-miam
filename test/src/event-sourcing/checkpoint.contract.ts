import { Checkpoint } from '@market-miam/event-sourcing';
import { describe, it, beforeEach, expect } from 'vitest';

export function checkpointContract(
  implementationName: string,
  createCheckpoint: () => Checkpoint,
): void {
  describe(`Checkpoint contract: ${implementationName}`, () => {
    let checkpoint: Checkpoint;

    beforeEach(() => {
      checkpoint = createCheckpoint();
    });

    it('reads 0 before any position is written', async () => {
      expect(await checkpoint.read()).toBe(0);
    });

    it('reads back the last written position', async () => {
      await checkpoint.write(5);
      await checkpoint.write(8);

      expect(await checkpoint.read()).toBe(8);
    });
  });
}
