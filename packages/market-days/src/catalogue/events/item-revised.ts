import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemRevised = DomainEvent<'ItemRevised', { itemId: string, name: string, description: string, price: number }>
