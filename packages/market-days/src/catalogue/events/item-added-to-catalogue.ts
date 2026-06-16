import { DomainEvent } from '@market-monster/event-sourcing';

export type ItemAddedToCatalogue = DomainEvent<'ItemAddedToCatalogue', {
  itemId: string;
  name: string;
  description: string;
  price: number;
  imageReference: string;
}>
