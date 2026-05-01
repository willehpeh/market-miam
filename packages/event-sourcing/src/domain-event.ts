export type DomainEvent<T extends string = string, P extends Record<string, unknown> = Record<string, unknown>> = {
  type: T;
  payload: P;
};
