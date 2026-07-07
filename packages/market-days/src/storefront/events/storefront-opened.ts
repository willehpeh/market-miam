import { DomainEvent } from '@market-miam/event-sourcing';

export type StorefrontOpened = DomainEvent<'StorefrontOpened', {
  vendorId: string;
}>
