import { RepertoireViews } from './repertoire-views';
import { Projection, StoredEvent } from '@market-monster/event-sourcing';
import { vendorIdFrom } from '@market-monster/shared-kernel';
import { ItemAddedToRepertoire, RepertoireEvent } from '../repertoire/events';

export class RepertoireViewProjection implements Projection {

  constructor(private readonly views: RepertoireViews) {}

  eventTypes(): string[] {
    return ['ItemAddedToRepertoire'];
  }

  async handle(event: StoredEvent): Promise<void> {
    switch (event.type as RepertoireEvent['type']) {
      case 'ItemAddedToRepertoire': {
        return this.handleItemAdded(event);
      }
    }
  }

  private async handleItemAdded(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemAddedToRepertoire['payload'];
    return this.views.addItemToRepertoire({
      itemId: payload.itemId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      photoUrl: payload.photoUrl
    }, vendorIdFrom(event));
  }
}
