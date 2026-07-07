import { beforeEach, describe, expect, it } from 'vitest';
import { DataKeys } from '@market-miam/event-sourcing';

export function dataKeysContract(name: string, create: () => DataKeys): void {
  describe(`DataKeys contract: ${name}`, () => {
    let keys: DataKeys;

    beforeEach(() => {
      keys = create();
    });

    it('mints a 32-byte key on first request for a subject', async () => {
      expect(await keys.getOrCreateKeyFor('vendor-1')).toHaveLength(32);
    });

    it('returns the same key on repeated getOrCreate for one subject', async () => {
      const first = await keys.getOrCreateKeyFor('vendor-1');
      const second = await keys.getOrCreateKeyFor('vendor-1');
      expect(second.equals(first)).toBe(true);
    });

    it('mints distinct keys for distinct subjects', async () => {
      const a = await keys.getOrCreateKeyFor('vendor-1');
      const b = await keys.getOrCreateKeyFor('vendor-2');
      expect(b.equals(a)).toBe(false);
    });

    it('findKeyFor returns null for a subject that has no key', async () => {
      expect(await keys.findKeyFor('unknown')).toBeNull();
    });

    it('findKeyFor returns the minted key', async () => {
      const minted = await keys.getOrCreateKeyFor('vendor-1');
      expect((await keys.findKeyFor('vendor-1'))?.equals(minted)).toBe(true);
    });

    it('findKeyFor returns null after the key is shredded', async () => {
      await keys.getOrCreateKeyFor('vendor-1');
      await keys.shred('vendor-1');
      expect(await keys.findKeyFor('vendor-1')).toBeNull();
    });

    it('shredding a subject with no key is a no-op', async () => {
      await expect(keys.shred('never-existed')).resolves.toBeUndefined();
    });
  });
}
