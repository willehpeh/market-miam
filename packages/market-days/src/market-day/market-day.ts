import { Aggregate, DomainEvent } from '@market-monster/event-sourcing';

export type PlannedItem = {
  itemId: string;
  quantity?: number;
};

export class MarketDay extends Aggregate {
  apply(event: DomainEvent): void {
  }

  planItems(items: PlannedItem[], marketId: string, date: string) {
    this.raise({
      type: 'ItemsPlannedForMarketDay',
      payload: { items, marketId, date }
    });
  }
}
