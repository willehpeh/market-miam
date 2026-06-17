import { DomainEvent } from '@market-monster/event-sourcing';

export type StorefrontCoverPhotoSet = DomainEvent<'StorefrontCoverPhotoSet', {
  imageReference: string;
}>
