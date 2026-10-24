import { beforeEach, describe, expect, it } from 'vitest';
import { VendorLegalIdentityView, VendorLegalIdentityViews, VendorLegalIdentityViewStore } from '@market-miam/market-days';

type Store = VendorLegalIdentityViews & VendorLegalIdentityViewStore;

const identity: VendorLegalIdentityView = {
  siret: '73282932000074',
  siren: '732829320',
  vatNumber: 'FR44732829320',
  legalName: 'Marie Dupont',
  address: '12 rue des Halles, 92330 Sceaux',
  contactEmail: 'contact@chez-marie.fr',
  phone: '06 12 34 56 78',
  vatRegime: 'assujetti',
  mediatorName: null,
  mediatorUrl: null,
  legalForm: null,
  shareCapital: null,
  registryCity: null,
  legalRepresentative: null,
};

export function vendorLegalIdentityViewsContract(name: string, create: () => Store): void {
  describe(`VendorLegalIdentityViews contract: ${name}`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    it('has no identity for an unknown vendor', async () => {
      expect(await store.findByVendor('nobody')).toBeUndefined();
    });

    it('holds the identity a vendor provided, nulls included', async () => {
      await store.provide('v1', identity);

      expect(await store.findByVendor('v1')).toEqual(identity);
    });

    it('holds only the latest identity', async () => {
      await store.provide('v1', identity);
      const societe = { ...identity, legalName: 'Chez Marie SARL', legalForm: 'SARL', shareCapital: '5000', registryCity: 'Nanterre', legalRepresentative: 'Marie Dupont' };

      await store.provide('v1', societe);

      expect(await store.findByVendor('v1')).toEqual(societe);
    });

    it("remove drops one vendor's identity and leaves the others", async () => {
      await store.provide('v1', identity);
      await store.provide('v2', identity);

      await store.remove('v1');

      expect(await store.findByVendor('v1')).toBeUndefined();
      expect(await store.findByVendor('v2')).toEqual(identity);
    });

    it('clear empties the store', async () => {
      await store.provide('v1', identity);

      await store.clear();

      expect(await store.findByVendor('v1')).toBeUndefined();
    });
  });
}
