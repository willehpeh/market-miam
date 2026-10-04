import { describe, expect, it } from 'vitest';
import {
  DomainEvent,
  InMemoryDataKeys,
  InMemoryEventStore,
  ShreddingEventStore,
} from '@market-miam/event-sourcing';
import { vendorPiiFields, vendorPiiKeyScopes } from '@market-miam/market-days';

// Guards the real registry against a silent typo: a mis-named field or event type
// would leave PII plaintext at rest, and a plain round-trip test wouldn't notice
// (plaintext in = plaintext out). So assert the ciphertext is actually there.
function shreddingStore() {
  const inner = new InMemoryEventStore();
  const keys = new InMemoryDataKeys();
  return { store: new ShreddingEventStore(inner, keys, vendorPiiFields, 'vendorId', vendorPiiKeyScopes), inner, keys };
}

describe('vendorPiiFields', () => {
  it('encrypts the email of VendorRegistered at rest', async () => {
    const { store, inner } = shreddingStore();
    const registered: DomainEvent = {
      type: 'VendorRegistered',
      payload: { vendorId: 'v1', registeredAt: '2026-07-06T00:00:00Z', email: 'marie@example.fr' },
      version: 1,
    };

    await store.append('vendor-v1', [registered], 0, { vendorId: 'v1' });

    const [atRest] = await inner.load('vendor-v1');
    expect(atRest.payload['email']).toMatch(/^enc:v2:/);

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload).toEqual({
      vendorId: 'v1',
      registeredAt: '2026-07-06T00:00:00Z',
      email: 'marie@example.fr',
    });
  });

  it('encrypts name, description and phone of StorefrontInformationEdited at rest', async () => {
    const { store, inner } = shreddingStore();
    const edited: DomainEvent = {
      type: 'StorefrontInformationEdited',
      payload: { name: 'Chez Marie', description: 'Pains et viennoiseries', phone: '0600000000' },
      version: 1,
    };

    await store.append('storefront-v1', [edited], 0, { vendorId: 'v1' });

    const [atRest] = await inner.load('storefront-v1');
    expect(atRest.payload['name']).toMatch(/^enc:v2:/);
    expect(atRest.payload['description']).toMatch(/^enc:v2:/);
    expect(atRest.payload['phone']).toMatch(/^enc:v2:/);

    const [loaded] = await store.load('storefront-v1');
    expect(loaded.payload).toEqual({ name: 'Chez Marie', description: 'Pains et viennoiseries', phone: '0600000000' });
  });

  it('encrypts every field of VendorLegalIdentityProvided but the vendorId, under a key that outlives erasure', async () => {
    const { store, inner, keys } = shreddingStore();
    const payload = {
      vendorId: 'v1',
      siret: '73282932000074',
      siren: '732829320',
      vatNumber: 'FR44732829320',
      legalName: 'Chez Marie SARL',
      address: '12 rue des Halles, 92330 Sceaux',
      contactEmail: 'contact@chez-marie.fr',
      phone: '0612345678',
      vatRegime: 'assujetti',
      mediatorName: 'CM2C',
      mediatorUrl: 'https://www.cm2c.net',
      legalForm: 'SARL',
      shareCapital: '5000',
      registryCity: 'Nanterre',
      legalRepresentative: 'Marie Dupont',
    };

    await store.append('vendor-v1', [{ type: 'VendorLegalIdentityProvided', payload, version: 1 }], 0, { vendorId: 'v1' });

    const [atRest] = await inner.load('vendor-v1');
    const { vendorId, ...personal } = atRest.payload;
    expect(vendorId).toBe('v1');
    for (const value of Object.values(personal)) {
      expect(value).toMatch(/^enc:v2:/);
    }

    await keys.shred('v1');

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload).toEqual(payload);
  });
});
