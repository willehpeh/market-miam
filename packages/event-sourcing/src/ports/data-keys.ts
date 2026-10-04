export abstract class DataKeys {
  abstract getOrCreateKeyFor(subjectId: string): Promise<Buffer>;
  abstract findKeyFor(subjectId: string): Promise<Buffer | null>;
  abstract shred(subjectId: string): Promise<void>;
  // A key that must outlive its subject's erasure, then die (ADR 0056): shredDue shreds it
  // once `at` has come.
  abstract scheduleShred(subjectId: string, at: Date): Promise<void>;
  abstract shredDue(now: Date): Promise<void>;
}
