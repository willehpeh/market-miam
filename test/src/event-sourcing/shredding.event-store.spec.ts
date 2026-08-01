import { describe, expect, it } from 'vitest';
import {
  DomainEvent,
  InMemoryDataKeys,
  InMemoryEventStore,
  PiiFields,
  SHREDDED,
  ShreddingEventStore,
} from '@market-miam/event-sourcing';

const vendorPii: PiiFields = { VendorRegistered: ['email'] };
const v1 = { vendorId: 'v1' };

function shreddingOver(inner = new InMemoryEventStore()) {
  const keys = new InMemoryDataKeys();
  return { store: new ShreddingEventStore(inner, keys, vendorPii, 'vendorId'), inner, keys };
}

const registered = (email: unknown): DomainEvent => ({
  type: 'VendorRegistered',
  payload: { vendorId: 'v1', registeredAt: '2026-07-06T00:00:00Z', email },
  version: 1,
});

describe('ShreddingEventStore', () => {
  it('encrypts registered PII fields at rest and decrypts them on load', async () => {
    const { store, inner } = shreddingOver();

    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    const [atRest] = await inner.load('vendor-v1');
    expect(atRest.payload['email']).toMatch(/^enc:v1:/);

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload).toEqual({
      vendorId: 'v1',
      registeredAt: '2026-07-06T00:00:00Z',
      email: 'vendor@example.com',
    });
  });

  it('leaves unregistered fields of a registered event as plaintext at rest', async () => {
    const { store, inner } = shreddingOver();

    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    const [atRest] = await inner.load('vendor-v1');
    expect(atRest.payload['vendorId']).toBe('v1');
    expect(atRest.payload['registeredAt']).toBe('2026-07-06T00:00:00Z');
  });

  it('decrypts PII fields on loadFrom', async () => {
    const { store } = shreddingOver();

    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    const [loaded] = await store.loadFrom(0, 10);
    expect(loaded.payload['email']).toBe('vendor@example.com');
  });

  it('round-trips an event type outside the registry untouched', async () => {
    const { store, inner } = shreddingOver();
    const opened: DomainEvent = { type: 'StorefrontOpened', payload: { vendorId: 'v1' }, version: 1 };

    await store.append('storefront-v1', [opened], 0, v1);

    const [atRest] = await inner.load('storefront-v1');
    expect(atRest.payload).toEqual({ vendorId: 'v1' });
  });

  it('reads shredded PII fields back as the SHREDDED sentinel', async () => {
    const { store, keys } = shreddingOver();
    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    await keys.shred('v1');

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload).toEqual({
      vendorId: 'v1',
      registeredAt: '2026-07-06T00:00:00Z',
      email: SHREDDED,
    });
  });

  it('passes plaintext PII through on read without decrypting', async () => {
    const { store, inner } = shreddingOver();
    await inner.append('vendor-v1', [registered('plain@example.com')], 0, v1);

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload['email']).toBe('plain@example.com');
  });

  it('rejects an append that carries PII with no vendorId in metadata', async () => {
    const { store, inner } = shreddingOver();

    await expect(store.append('vendor-v1', [registered('vendor@example.com')], 0)).rejects.toThrow(/vendorId/);
    expect(await inner.load('vendor-v1')).toEqual([]);
  });

  it('rejects encrypting a PII field whose value is not a string', async () => {
    const { store } = shreddingOver();

    await expect(store.append('vendor-v1', [registered(123)], 0, v1)).rejects.toThrow(/must be a string/);
  });

  it('passes a null PII field through untouched on append and load', async () => {
    const { store, inner } = shreddingOver();

    await store.append('vendor-v1', [registered(null)], 0, v1);

    const [atRest] = await inner.load('vendor-v1');
    expect(atRest.payload['email']).toBeNull();

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload['email']).toBeNull();
  });

  it('reads PII as SHREDDED when a stored event carries no subject metadata', async () => {
    const { store, inner } = shreddingOver();
    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    const [stored] = await inner.load('vendor-v1');
    delete stored.metadata;

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload['email']).toBe(SHREDDED);
    expect(loaded.payload['vendorId']).toBe('v1');
  });

  it('lets the catch-up path read past an event with no subject metadata', async () => {
    const { store, inner } = shreddingOver();
    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);
    await store.append('vendor-v2', [registered('other@example.com')], 0, { vendorId: 'v2' });

    const [broken] = await inner.load('vendor-v1');
    delete broken.metadata;

    const fromCatchUp = await store.loadFrom(0, 10);
    expect(fromCatchUp.map((e) => e.payload['email'])).toEqual([SHREDDED, 'other@example.com']);
  });

  it('throws on load when a ciphertext has been tampered with', async () => {
    const { store, inner } = shreddingOver();
    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    const [stored] = await inner.load('vendor-v1');
    const [, , iv, tag, ct] = (stored.payload['email'] as string).split(':');
    const bytes = Buffer.from(ct, 'base64');
    bytes[0] ^= 0xff;
    stored.payload['email'] = `enc:v1:${iv}:${tag}:${bytes.toString('base64')}`;

    await expect(store.load('vendor-v1')).rejects.toThrow();
  });
});
