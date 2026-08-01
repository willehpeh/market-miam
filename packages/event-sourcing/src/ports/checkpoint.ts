// A checkpoint is a fencing token, not a mutable cell (ADR 0036): advancing it
// requires naming the position you believe it holds, and a mismatch throws
// CheckpointConflictError. Called inside the per-event transaction, a conflict
// therefore rolls the handler's effects back with it — a stale writer (another
// instance, or a poll in flight across a rebuild) cannot land effects or move
// the position.
export abstract class Checkpoint {
  abstract read(): Promise<number>;
  abstract advance(from: number, to: number): Promise<void>;
  // The one legitimate non-forward move: rebuild returns the position to 0
  // unconditionally, fencing out every writer that read a pre-reset position.
  abstract reset(): Promise<void>;
}
