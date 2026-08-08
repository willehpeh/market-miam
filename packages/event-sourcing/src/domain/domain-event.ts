export type DomainEvent<T extends string = string, P extends Record<string, unknown> = Record<string, unknown>> = {
  type: T;
  payload: P;
  version: number;
};

// The member of a discriminated union whose `type` is K — the type-level twin of the
// narrowing a `switch (event.type)` performs.
export type EventOfType<E extends DomainEvent, K extends E['type']> = Extract<E, { type: K }>;
