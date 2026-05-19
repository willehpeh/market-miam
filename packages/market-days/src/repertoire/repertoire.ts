import { ItemAddedToRepertoire, RepertoireEvent } from './events';
import { Aggregate, UnhandledEventTypeError } from '@market-monster/event-sourcing';
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
        // @ts-expect-error this single-case switch doesn't narrow the type of event to "never" for some unexpected TS reason
        // Remove the @ts-expect-error when a second event type is added
        throw new UnhandledEventTypeError(event, this.constructor.name);
    }
  }
}
