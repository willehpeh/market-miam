import { Aggregate, DomainEvent } from '@market-miam/event-sourcing';

export class Tally extends Aggregate {
  private counted: string[] = [];

  apply(event: DomainEvent): void {
    this.counted.push(event.payload['what'] as string);
  }

  count(what: string): void {
    this.raise({ type: 'Counted', payload: { what }, version: 1 } satisfies DomainEvent);
  }

  hasCounted(): string[] {
    return this.counted.slice();
  }
}
