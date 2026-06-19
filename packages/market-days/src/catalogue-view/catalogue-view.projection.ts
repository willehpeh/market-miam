import { CatalogueViewStore } from './catalogue-view.store';
import { Projection, StoredEvent } from '@market-monster/event-sourcing';
import { vendorIdFrom } from '@market-monster/shared-kernel';
import { ItemAddedToCatalogue, ItemPriceChanged, CatalogueEvent, ItemRetired } from '../catalogue/events';

export class CatalogueViewProjection implements Projection {

  private readonly _handlers: Record<CatalogueEvent['type'], (event: StoredEvent) => Promise<void>> = {
    ItemAddedToCatalogue: e => this.handleItemAdded(e),
    ItemPriceChanged: e => this.handleItemPriceChanged(e),
    ItemRetired: e => this.handleItemRetired(e)
  };

  constructor(private readonly store: CatalogueViewStore) {}

  eventTypes(): string[] {
    return Object.keys(this._handlers);
  }

  async handle(event: StoredEvent): Promise<void> {
    return this._handlers[event.type as CatalogueEvent['type']](event);
  }

  private async handleItemAdded(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemAddedToCatalogue['payload'];
    return this.store.addItemToCatalogue({
      itemId: payload.itemId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      imageReference: payload.imageReference
    }, vendorIdFrom(event));
  }

  private handleItemPriceChanged(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemPriceChanged['payload'];
    return this.store.updateItemPrice(payload.itemId, payload.price, vendorIdFrom(event));
  }

  private handleItemRetired(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemRetired['payload'];
    return this.store.retireItem(payload.itemId, vendorIdFrom(event));
  }
}
