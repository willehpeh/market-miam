import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemRevised = DomainEvent<'ItemRevised', {
  itemId: string;
  name: string;
  description: string;
  price?: number;
  variants?: { name: string; description: string; price: number }[];
  // Absent on events from before allergens existed: the item is undeclared, not allergen-free.
  allergens?: string[];
}>
