import { DomainEvent } from '@market-miam/event-sourcing';

export type StorefrontPublished = DomainEvent<'StorefrontPublished', Record<string, never>>;
