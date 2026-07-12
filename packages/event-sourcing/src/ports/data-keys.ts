export abstract class DataKeys {
  abstract getOrCreateKeyFor(subjectId: string): Promise<Buffer>;
  abstract findKeyFor(subjectId: string): Promise<Buffer | null>;
  abstract shred(subjectId: string): Promise<void>;
}
