import { RepertoireViews } from './repertoire-views';
import { Projection, StoredEvent } from '@market-monster/event-sourcing';
import { vendorIdFrom } from '@market-monster/shared-kernel';
import { ItemAddedToRepertoire, RepertoireEvent } from '../repertoire/events';

export class RepertoireViewProjection implements Projection {
  constructor(private readonly views: RepertoireViews) {}

  async handle(event: StoredEvent): Promise<void> {
    switch (event.type as RepertoireEvent['type']) {
      case 'ItemAddedToRepertoire': {
        const payload = event.payload as ItemAddedToRepertoire['payload'];
        await this.views.addItemToRepertoire({
          itemId: payload.itemId,
          name: payload.name,
          description: payload.description,
          price: payload.price,
          photoUrl: payload.photoUrl,
        }, vendorIdFrom(event));
      }
    }
  }
}
