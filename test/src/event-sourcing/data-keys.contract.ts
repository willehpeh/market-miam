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

    it('refuses to mint a fresh key for a shredded subject', async () => {
      await keys.getOrCreateKeyFor('vendor-1');
      await keys.shred('vendor-1');

      await expect(keys.getOrCreateKeyFor('vendor-1')).rejects.toThrow(/shredded/);
      expect(await keys.findKeyFor('vendor-1')).toBeNull();
    });

    it('keeps a key scheduled for shredding until its date', async () => {
      const minted = await keys.getOrCreateKeyFor('vendor-1:legal');
      await keys.scheduleShred('vendor-1:legal', new Date('2031-06-23T09:00:00.000Z'));

      await keys.shredDue(new Date('2031-06-23T08:59:59.999Z'));

      expect((await keys.findKeyFor('vendor-1:legal'))?.equals(minted)).toBe(true);
    });

    it('shreds a scheduled key once its date has come', async () => {
      await keys.getOrCreateKeyFor('vendor-1:legal');
      await keys.scheduleShred('vendor-1:legal', new Date('2031-06-23T09:00:00.000Z'));

      await keys.shredDue(new Date('2031-06-23T09:00:00.000Z'));

      expect(await keys.findKeyFor('vendor-1:legal')).toBeNull();
      await expect(keys.getOrCreateKeyFor('vendor-1:legal')).rejects.toThrow(/shredded/);
    });

    it('leaves unscheduled keys to the sweep untouched', async () => {
      const minted = await keys.getOrCreateKeyFor('vendor-1');

      await keys.shredDue(new Date('2099-01-01T00:00:00.000Z'));

      expect((await keys.findKeyFor('vendor-1'))?.equals(minted)).toBe(true);
    });

    it('shredding a subject with no key is a no-op', async () => {
      await expect(keys.shred('never-existed')).resolves.toBeUndefined();
    });
  });
}
