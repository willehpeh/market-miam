import { ItemAddedToRepertoire, RepertoireEvent } from './events';
import { Aggregate, InvalidEventTypeError } from '@market-monster/event-sourcing';
import { Url } from '@market-monster/common';
import { ItemDescription, ItemId, ItemName, ItemPrice } from './item';

export class Repertoire extends Aggregate {

  addItem(id: ItemId, name: ItemName, description: ItemDescription, price: ItemPrice, photoUrl: Url) {
    const event: ItemAddedToRepertoire = {
      type: 'ItemAddedToRepertoire',
      payload: {
        itemId: id.value(),
        name: name.value(),
        description: description.value(),
        price: price.value(),
        photoUrl: photoUrl.value(),
      },
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
