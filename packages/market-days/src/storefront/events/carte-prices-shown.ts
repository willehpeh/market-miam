import { DomainEvent } from '@market-miam/event-sourcing';

export type CartePricesShown = DomainEvent<'CartePricesShown', Record<string, never>>;
