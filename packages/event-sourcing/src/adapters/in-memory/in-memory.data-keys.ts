import { randomBytes } from 'node:crypto';
import { DataKeys } from '../../ports/data-keys';

export class InMemoryDataKeys extends DataKeys {
  private readonly keys = new Map<string, Buffer>();

  getOrCreateKeyFor(subjectId: string): Promise<Buffer> {
    let key = this.keys.get(subjectId);
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
    this.keys.delete(subjectId);
    return Promise.resolve();
  }
}
