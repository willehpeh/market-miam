import { Aggregate, InvalidEventTypeError } from '@market-monster/event-sourcing';
import { ItemAddedToRepertoire, RepertoireEvent } from './events';

export class Repertoire extends Aggregate {

  addItem(itemId: string, name: string, description: string, price: number, photoUrl: string) {
    const event: ItemAddedToRepertoire = {
      type: 'ItemAddedToRepertoire',
      payload: { itemId, name, description, price, photoUrl }
    };
    this.raise(event);
  }

  apply(event: RepertoireEvent): void {
    switch (event.type) {
      case 'ItemAddedToRepertoire':
        // implement when necessary
        break;
      default:
        throw new InvalidEventTypeError(event.type, this.constructor.name);
    }
  }
}
