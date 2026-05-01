export type StoredEvent = {
  globalPosition: number;
  streamId: string;
  streamPosition: number;
  timestamp: number;
  type: string;
  payload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
