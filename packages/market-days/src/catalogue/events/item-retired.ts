import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemRetired = DomainEvent<'ItemRetired', { itemId: string }>