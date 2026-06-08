import { DomainEvent } from '@market-monster/event-sourcing';

export type ItemPriceChanged = DomainEvent<'ItemPriceChanged', { itemId: string, price: number }>
