import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemsReordered = DomainEvent<'ItemsReordered', {
  itemIds: string[];
}>;
