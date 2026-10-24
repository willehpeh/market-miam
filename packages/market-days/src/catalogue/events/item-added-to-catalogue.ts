import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemAddedToCatalogue = DomainEvent<'ItemAddedToCatalogue', {
  itemId: string;
  name: string;
  description: string;
  price?: number;
  imageReference?: string;
  variants?: { name: string; description: string; price: number }[];
  // Absent on events from before allergens existed: the item is undeclared, not allergen-free.
  allergens?: string[];
}>
