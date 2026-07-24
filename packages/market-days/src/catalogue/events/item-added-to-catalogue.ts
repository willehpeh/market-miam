import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemAddedToCatalogue = DomainEvent<'ItemAddedToCatalogue', {
  itemId: string;
  name: string;
  description: string;
  price?: number;
  imageReference?: string;
  variants?: { name: string; description: string; price: number }[];
}>
