export class UnhandledEventTypeError extends Error {
  constructor(event: never, aggregateType: string) {
    super(`Unhandled event type: ${(event as { type: string }).type} for aggregate: ${aggregateType}`);
    this.name = 'UnhandledEventTypeError';
  }
}
