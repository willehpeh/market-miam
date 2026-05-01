export type DomainEvent = {
  id: string;
  type: string;
  streamId: string;
  payload: {
    [key: string]: unknown;
  };
  metadata?: {
    [key: string]: unknown;
  };
};
