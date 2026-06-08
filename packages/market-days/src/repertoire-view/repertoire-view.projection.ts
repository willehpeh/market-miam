import { RepertoireViewStore } from './repertoire-view-store';
import { Projection, StoredEvent } from '@market-monster/event-sourcing';
import { vendorIdFrom } from '@market-monster/shared-kernel';
import { ItemAddedToCatalogue, ItemPriceChanged, CatalogueEvent } from '../catalogue/events';

export class RepertoireViewProjection implements Projection {

  constructor(private readonly store: RepertoireViewStore) {}

  eventTypes(): string[] {
    return [
      'ItemAddedToRepertoire',
      'ItemPriceChanged',
    ];
  }

  async handle(event: StoredEvent): Promise<void> {
    switch (event.type as CatalogueEvent['type']) {
      case 'ItemAddedToRepertoire': {
        return this.handleItemAdded(event);
      }
      case 'ItemPriceChanged': {
        return this.handleItemPriceChanged(event);
      }
    }
  }

  private async handleItemAdded(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemAddedToCatalogue['payload'];
    return this.store.addItemToRepertoire({
      itemId: payload.itemId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      photoUrl: payload.photoUrl
    }, vendorIdFrom(event));
  }

  private handleItemPriceChanged(event: StoredEvent) {
    const payload = event.payload as ItemPriceChanged['payload'];
    return this.store.updateItemPrice(payload.itemId, payload.price, vendorIdFrom(event));
  }
}
