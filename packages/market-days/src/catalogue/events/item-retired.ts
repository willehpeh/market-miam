import { DomainEvent } from '@market-monster/event-sourcing';

export type ItemRetired = DomainEvent<'ItemRetired', { itemId: string }>