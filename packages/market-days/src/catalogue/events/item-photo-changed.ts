import { DomainEvent } from '@market-miam/event-sourcing';

export type ItemPhotoChanged = DomainEvent<'ItemPhotoChanged', { itemId: string, imageReference: string }>
