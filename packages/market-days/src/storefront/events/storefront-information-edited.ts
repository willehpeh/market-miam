import { DomainEvent } from '@market-miam/event-sourcing';

export type StorefrontInformationEdited = DomainEvent<'StorefrontInformationEdited', {
  name: string;
  description: string;
  phone: string;
}>
