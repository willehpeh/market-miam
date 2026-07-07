import { DomainEvent } from '@market-miam/event-sourcing';

export type StorefrontCoverPhotoSet = DomainEvent<'StorefrontCoverPhotoSet', {
  imageReference: string;
}>
