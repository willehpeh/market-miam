import { DomainEvent } from '@market-monster/event-sourcing';

export type StorefrontOpened = DomainEvent<'StorefrontOpened', {
  vendorId: string;
}>
