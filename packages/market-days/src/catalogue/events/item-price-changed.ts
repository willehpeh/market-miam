import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemPriceChanged = DomainEvent<'ItemPriceChanged', { itemId: string, price: number }>
