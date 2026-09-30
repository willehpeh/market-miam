import { DomainEvent } from '@market-miam/event-sourcing';

export type CartePricesHidden = DomainEvent<'CartePricesHidden', Record<string, never>>;
