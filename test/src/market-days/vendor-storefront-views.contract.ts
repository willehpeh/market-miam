import { beforeEach, describe, expect, it } from 'vitest';
import { VendorStorefrontViews, VendorStorefrontViewStore } from '@market-miam/market-days';

type Store = VendorStorefrontViews & VendorStorefrontViewStore;

const info = { name: 'Chez Marie', description: 'Pains et viennoiseries', phone: '0600000000' };

export function vendorStorefrontViewsContract(name: string, create: () => Store): void {
  describe(`VendorStorefrontViews contract: ${name}`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    it('has no view for an unknown vendor', async () => {
      expect(await store.findByVendor('nobody')).toBeUndefined();
    });

    it('open creates an empty view', async () => {
      await store.open('v1');
      expect(await store.findByVendor('v1')).toEqual({ name: '', description: '', phone: '', imageReference: '' });
    });

    it('open is idempotent', async () => {
      await store.open('v1');
      await store.open('v1');
      expect(await store.findByVendor('v1')).toEqual({ name: '', description: '', phone: '', imageReference: '' });
    });

    it('editInformation creates the view if unseen', async () => {
      await store.editInformation('v1', info);
      expect(await store.findByVendor('v1')).toEqual({ ...info, imageReference: '' });
    });

    it('editInformation sets its fields and preserves the cover photo', async () => {
      await store.setCoverPhoto('v1', 'img-1');
      await store.editInformation('v1', info);
      expect(await store.findByVendor('v1')).toEqual({ ...info, imageReference: 'img-1' });
    });

    it('setCoverPhoto sets the photo and preserves the information', async () => {
      await store.editInformation('v1', info);
      await store.setCoverPhoto('v1', 'img-2');
      expect(await store.findByVendor('v1')).toEqual({ ...info, imageReference: 'img-2' });
    });

    it('editInformation is last-write-wins', async () => {
      await store.editInformation('v1', { name: 'First', description: 'a', phone: '1' });
      await store.editInformation('v1', { name: 'Second', description: 'b', phone: '2' });
      expect(await store.findByVendor('v1')).toEqual({ name: 'Second', description: 'b', phone: '2', imageReference: '' });
    });

    it('clear empties the store', async () => {
      await store.editInformation('v1', info);
      await store.clear();
      expect(await store.findByVendor('v1')).toBeUndefined();
    });
  });
}
