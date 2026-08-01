import { createCipheriv, randomBytes } from 'node:crypto';
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
    expect(atRest.payload['email']).toMatch(/^enc:v2:/);

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

    await expect(store.append('vendor-v1', [registered('vendor@example.com')], 0)).rejects.toThrow(
      /ShreddingEventStore: no vendorId/,
    );
    expect(await inner.load('vendor-v1')).toEqual([]);
  });

  it('rejects a PII append whose subject id is empty', async () => {
    const { store } = shreddingOver();

    await expect(store.append('vendor-v1', [registered('vendor@example.com')], 0, { vendorId: '' })).rejects.toThrow(
      /ShreddingEventStore: no vendorId/,
    );
  });

  it('appends an event outside the registry without requiring subject metadata', async () => {
    const { store, inner } = shreddingOver();
    const opened: DomainEvent = { type: 'StorefrontOpened', payload: { note: 'plain' }, version: 1 };

    await store.append('storefront-v1', [opened], 0);

    expect(await inner.load('storefront-v1')).toHaveLength(1);
  });

  it('round-trips a multi-event PII batch appended in one call', async () => {
    const { store } = shreddingOver();

    await store.append(
      'vendor-v1',
      [registered('first@example.com'), registered('second@example.com')],
      0,
      v1,
    );

    const loaded = await store.load('vendor-v1');
    expect(loaded.map((e) => e.payload['email'])).toEqual(['first@example.com', 'second@example.com']);
  });

  it('resolves the data key once per event, not once per field', async () => {
    class CountingKeys extends InMemoryDataKeys {
      finds = 0;
      override findKeyFor(subjectId: string): Promise<Buffer | null> {
        this.finds++;
        return super.findKeyFor(subjectId);
      }
    }
    const keys = new CountingKeys();
    const store = new ShreddingEventStore(new InMemoryEventStore(), keys, { Edited: ['name', 'phone'] }, 'vendorId');
    await store.append('vendor-v1', [{ type: 'Edited', payload: { name: 'N', phone: 'P' }, version: 1 }], 0, v1);

    keys.finds = 0;
    await store.load('vendor-v1');

    expect(keys.finds).toBe(1);
  });

  it('returns the stored event instance untouched when nothing needed decrypting', async () => {
    const { store, inner } = shreddingOver();
    const opened: DomainEvent = { type: 'StorefrontOpened', payload: {}, version: 1 };
    await store.append('storefront-v1', [opened], 0, v1);

    const [stored] = await inner.load('storefront-v1');
    const [loaded] = await store.load('storefront-v1');

    expect(loaded).toBe(stored);
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

  it('reads PII as SHREDDED when a stored event carries an empty subject id', async () => {
    const { store, inner } = shreddingOver();
    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);

    const [stored] = await inner.load('vendor-v1');
    stored.metadata = { vendorId: '' };

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload['email']).toBe(SHREDDED);
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
    stored.payload['email'] = `enc:v2:${iv}:${tag}:${bytes.toString('base64')}`;

    await expect(store.load('vendor-v1')).rejects.toThrow();
  });

  it('detects a ciphertext swapped between two same-type events in one stream', async () => {
    const { store, inner } = shreddingOver();
    await store.append('vendor-v1', [registered('first@example.com')], 0, v1);
    await store.append('vendor-v1', [registered('second@example.com')], 1, v1);

    const [first, second] = await inner.load('vendor-v1');
    const swapped = first.payload['email'];
    first.payload['email'] = second.payload['email'];
    second.payload['email'] = swapped;

    await expect(store.load('vendor-v1')).rejects.toThrow();
  });

  it('detects a ciphertext moved to a same-position event in another stream', async () => {
    // Same subject on both streams, so both seal under one key — only the AAD's
    // streamId component can tell the ciphertexts apart.
    const { store, inner } = shreddingOver();
    await store.append('vendor-v1', [registered('vendor@example.com')], 0, v1);
    await store.append('vendor-v1-other', [registered('other@example.com')], 0, v1);

    const [ours] = await inner.load('vendor-v1');
    const [theirs] = await inner.load('vendor-v1-other');
    ours.payload['email'] = theirs.payload['email'];

    await expect(store.load('vendor-v1')).rejects.toThrow();
  });

  it('still decrypts values sealed under the enc:v1 envelope', async () => {
    const { store, inner, keys } = shreddingOver();
    const key = await keys.getOrCreateKeyFor('v1');
    const sealed = sealV1('legacy@example.com', key, 'vendor-v1', 'VendorRegistered', 'email');
    await inner.append('vendor-v1', [{ type: 'VendorRegistered', payload: { vendorId: 'v1', email: sealed }, version: 1 }], 0, v1);

    const [loaded] = await store.load('vendor-v1');
    expect(loaded.payload['email']).toBe('legacy@example.com');
  });
});

// Seals a value the way the pre-v2 write path did: 3-part NUL-separated AAD,
// enc:v1 prefix. Pins that historical ciphertexts stay readable forever.
function sealV1(value: string, key: Buffer, streamId: string, eventType: string, field: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`${streamId}\u0000${eventType}\u0000${field}`, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `enc:v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${ciphertext.toString('base64')}`;
}
