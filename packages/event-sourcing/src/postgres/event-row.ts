export interface EventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown> | null;
  version: number;
  stream_id: string;
  stream_position: number;
  global_position: string;
  created_at: string;
}
