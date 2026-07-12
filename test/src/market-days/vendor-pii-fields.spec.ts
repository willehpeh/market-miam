import { describe, expect, it } from 'vitest';
import {
  DomainEvent,
  InMemoryDataKeys,
  InMemoryEventStore,
  ShreddingEventStore,
} from '@market-miam/event-sourcing';
import { vendorPiiFields } from '@market-miam/market-days';

// Guards the real registry against a silent typo: a mis-named field or event type
// would leave PII plaintext at rest, and a plain round-trip test wouldn't notice
// (plaintext in = plaintext out). So assert the ciphertext is actually there.
function shreddingStore() {
  const inner = new InMemoryEventStore();
  return { store: new ShreddingEventStore(inner, new InMemoryDataKeys(), vendorPiiFields, 'vendorId'), inner };
}

describe('vendorPiiFields', () => {
  it('encrypts name, description and phone of StorefrontInformationEdited at rest', async () => {
    const { store, inner } = shreddingStore();
    const edited: DomainEvent = {
      type: 'StorefrontInformationEdited',
      payload: { name: 'Chez Marie', description: 'Pains et viennoiseries', phone: '0600000000' },
      version: 1,
    };

    await store.append('storefront-v1', [edited], 0, { vendorId: 'v1' });

    const [atRest] = await inner.load('storefront-v1');
    expect(atRest.payload['name']).toMatch(/^enc:v1:/);
    expect(atRest.payload['description']).toMatch(/^enc:v1:/);
    expect(atRest.payload['phone']).toMatch(/^enc:v1:/);

    const [loaded] = await store.load('storefront-v1');
    expect(loaded.payload).toEqual({ name: 'Chez Marie', description: 'Pains et viennoiseries', phone: '0600000000' });
  });
});
