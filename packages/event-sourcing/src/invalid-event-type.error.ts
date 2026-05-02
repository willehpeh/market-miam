export class InvalidEventTypeError extends Error {
  constructor(eventType: string, aggregateType: string) {
    super(`Invalid event type: ${eventType} for aggregate: ${aggregateType}`);
  }
}
