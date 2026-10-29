import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { DataKeys } from '../ports/data-keys';
import { DomainEvent } from '../domain/domain-event';
import { Events } from '../ports/events';
import { EventStore } from '../ports/event-store';
import { StoredEvent } from '../domain/stored-event';

export type PiiFields = Record<string, string[]>;

// Event types whose PII seals under a key of their own, `{subject}:{scope}`, so it can
// outlive the shredding of the subject's main key (ADR 0056).
export type KeyScopes = Record<string, string>;

// A shredded field reads back as this sentinel string, not null — so read-model
// columns stay NOT NULL and value objects never see null.
export const SHREDDED = '<shredded>';

// The envelope version names the AAD that sealed the value: v1 bound
// stream/type/field, v2 adds the stream position. Encrypt always writes the
// current version; decrypt dispatches on the prefix — the log is append-only,
// so v1 values never rewrite and their AAD is kept verbatim forever.
const V1_PREFIX = 'enc:v1:';
const V2_PREFIX = 'enc:v2:';

export class ShreddingEventStore implements EventStore, Events {
  constructor(
    private readonly inner: EventStore & Events,
    private readonly keys: DataKeys,
    private readonly pii: PiiFields,
    private readonly subjectKey: string,
    private readonly keyScopes: KeyScopes = {},
  ) {}

  async append(
    streamId: string,
    events: DomainEvent[],
    expectedStreamPosition: number,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    // Event i of the batch will land at expectedStreamPosition + i + 1; if the
    // concurrency check later rejects the append, nothing persists, so binding
    // the position into the AAD before the row exists cannot go stale.
    const encrypted = await Promise.all(
      events.map((event, index) => this.encrypt(event, streamId, expectedStreamPosition + index + 1, metadata)),
    );
    return this.inner.append(streamId, encrypted, expectedStreamPosition, metadata);
  }

  async load(streamId: string): Promise<StoredEvent[]> {
    const read = this.decryptingRead();
    return Promise.all((await this.inner.load(streamId)).map((event) => read.decrypt(event)));
  }

  async loadFrom(globalPosition: number, limit: number): Promise<StoredEvent[]> {
    const read = this.decryptingRead();
    return Promise.all((await this.inner.loadFrom(globalPosition, limit)).map((event) => read.decrypt(event)));
  }

  head(): Promise<number> {
    return this.inner.head();
  }

  private async encrypt(event: DomainEvent, streamId: string, streamPosition: number, metadata?: Record<string, unknown>): Promise<DomainEvent> {
    // null and undefined mean "nothing to encrypt" and pass through untouched;
    // any other non-string PII value still fails loudly below.
    const fields = (this.pii[event.type] ?? []).filter((field) => event.payload[field] != null);
    if (fields.length === 0) {
      return event;
    }
    const key = await this.keys.getOrCreateKeyFor(scoped(this.keyScopes, this.subjectOf(metadata), event.type));
    const payload = { ...event.payload };
    for (const field of fields) {
      const value = payload[field];
      if (typeof value !== 'string') {
        throw new Error(`ShreddingEventStore: PII field "${field}" of "${event.type}" must be a string to encrypt`);
      }
      payload[field] = encryptValue(value, key, aadV2(streamId, event.type, field, streamPosition));
    }
    return { ...event, payload };
  }

  // A new read per load() or loadFrom(), never kept on the store: see DecryptingRead.
  private decryptingRead(): DecryptingRead {
    return new DecryptingRead(this.keys, this.pii, this.subjectKey, this.keyScopes);
  }

  private subjectOf(metadata?: Record<string, unknown>): string {
    const subjectId = metadata?.[this.subjectKey];
    if (typeof subjectId !== 'string' || subjectId.length === 0) {
      throw new Error(`ShreddingEventStore: no ${this.subjectKey} in metadata for a PII-bearing event`);
    }
    return subjectId;
  }
}

// One load() or loadFrom(): decrypts the batch it is handed, fetching each subject's
// data key once for the whole batch. Every fetch is a data_keys query in production, and
// a 10,000-event PII stream used to pay one per event (M6, baseline 2026-10-29). Made per
// call and dropped when it returns, never kept on the store, so a key shredded between
// two reads is gone from the next. It keeps the pending lookup, not the key, so the
// concurrent decrypts of one Promise.all share it instead of each starting their own.
class DecryptingRead {
  private readonly keys = new Map<string, Promise<Buffer | null>>();

  constructor(
    private readonly dataKeys: DataKeys,
    private readonly pii: PiiFields,
    private readonly subjectKey: string,
    private readonly keyScopes: KeyScopes,
  ) {}

  async decrypt(event: StoredEvent): Promise<StoredEvent> {
    const fields = this.pii[event.type] ?? [];
    const payload = { ...event.payload };
    let changed = false;
    for (const field of fields) {
      const value = payload[field];
      if (typeof value !== 'string' || !isEnvelope(value)) {
        continue;
      }
      const key = await this.keyFor(event);
      payload[field] = key === null ? SHREDDED : this.decryptField(value, key, event, field);
      changed = true;
    }
    return changed ? { ...event, payload } : event;
  }

  // Still strict on purpose — an authentication failure is the tamper signal,
  // not a degradable read (ADR 0039 covers missing keys, not bad seals). The
  // message names the second possible cause: the AAD binds the stream position
  // predicted at encrypt time, so a store that broke the append position
  // promise fails here identically to tampering.
  private decryptField(envelope: string, key: Buffer, event: StoredEvent, field: string): string {
    try {
      return decryptValue(envelope, key, aadFor(envelope, event, field));
    } catch (error) {
      throw new Error(
        `ShreddingEventStore: authentication failed for "${field}" of "${event.type}" at ` +
          `${event.streamId}#${event.streamPosition} — the ciphertext was tampered with, or its ` +
          'AAD no longer matches the stored position',
        { cause: error },
      );
    }
  }

  // Total on purpose: a stored event without a resolvable subject has no
  // recoverable key, so its PII reads back as SHREDDED instead of throwing —
  // the log is append-only, so a throw here would brick the stream forever.
  // Write-path strictness is unchanged: encrypt still throws via subjectOf.
  // Keyed by the scoped id, so a subject's `:legal` key stays apart from its main one.
  private keyFor(event: StoredEvent): Promise<Buffer | null> {
    const subjectId = event.metadata?.[this.subjectKey];
    if (typeof subjectId !== 'string' || subjectId.length === 0) {
      return Promise.resolve(null);
    }
    const scopedId = scoped(this.keyScopes, subjectId, event.type);
    let key = this.keys.get(scopedId);
    if (!key) {
      key = this.dataKeys.findKeyFor(scopedId);
      this.keys.set(scopedId, key);
    }
    return key;
  }
}

// `{subject}:{scope}` for an event type sealed under a key of its own (ADR 0056).
function scoped(keyScopes: KeyScopes, subjectId: string, eventType: string): string {
  const scope = keyScopes[eventType];
  return scope ? `${subjectId}:${scope}` : subjectId;
}

function isEnvelope(value: string): boolean {
  return value.startsWith(V1_PREFIX) || value.startsWith(V2_PREFIX);
}

function aadFor(envelope: string, event: StoredEvent, field: string): Buffer {
  return envelope.startsWith(V1_PREFIX)
    ? aadV1(event.streamId, event.type, field)
    : aadV2(event.streamId, event.type, field, event.streamPosition);
}

// v1 bound whose field a ciphertext is (stream, type, field, NUL-separated) but
// not which occurrence: two same-type events in one stream had interchangeable
// ciphertexts. Kept verbatim to decrypt values sealed before v2.
function aadV1(streamId: string, eventType: string, field: string): Buffer {
  return Buffer.from(`${streamId}\u0000${eventType}\u0000${field}`, 'utf8');
}

// v2 adds the stream position — a ciphertext moved to any other event fails
// authentication — and length-prefixes each component, so no separator
// ambiguity exists regardless of component content.
function aadV2(streamId: string, eventType: string, field: string, streamPosition: number): Buffer {
  return lengthPrefixed(streamId, eventType, field, String(streamPosition));
}

function lengthPrefixed(...components: string[]): Buffer {
  return Buffer.concat(
    components.flatMap((component) => {
      const bytes = Buffer.from(component, 'utf8');
      const length = Buffer.alloc(4);
      length.writeUInt32BE(bytes.length);
      return [length, bytes];
    }),
  );
}

function encryptValue(value: string, key: Buffer, additional: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(additional);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${V2_PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`;
}

function decryptValue(envelope: string, key: Buffer, additional: Buffer): string {
  const [, , iv, tag, ciphertext] = envelope.split(':');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAAD(additional);
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}
