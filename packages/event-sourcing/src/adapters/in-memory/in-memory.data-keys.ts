import { randomBytes } from 'node:crypto';
import { DataKeys } from '../../ports/data-keys';

// A shredded subject keeps its entry as a null tombstone, so it can never be minted again.
export class InMemoryDataKeys extends DataKeys {
  private readonly keys = new Map<string, Buffer | null>();

  getOrCreateKeyFor(subjectId: string): Promise<Buffer> {
    let key = this.keys.get(subjectId);
    if (key === null) {
      return Promise.reject(new Error(`InMemoryDataKeys: the key for "${subjectId}" was shredded`));
    }
    if (!key) {
      key = randomBytes(32);
      this.keys.set(subjectId, key);
    }
    return Promise.resolve(key);
  }

  findKeyFor(subjectId: string): Promise<Buffer | null> {
    return Promise.resolve(this.keys.get(subjectId) ?? null);
  }

  shred(subjectId: string): Promise<void> {
    if (this.keys.has(subjectId)) {
      this.keys.set(subjectId, null);
    }
    return Promise.resolve();
  }
}
