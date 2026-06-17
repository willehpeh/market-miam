import { DomainEvent } from '@market-monster/event-sourcing';

export type StorefrontInformationEdited = DomainEvent<'StorefrontInformationEdited', {
  name: string;
  description: string;
}>
