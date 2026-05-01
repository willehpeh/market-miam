import { DomainEvent } from '@market-monster/event-sourcing';

export type ItemAddedToRepertoire = DomainEvent<'ItemAddedToRepertoire', {
  id: string;
  repertoireId: string;
  name: string;
  description: string;
  price: number;
  photoUrl: string;
}>
