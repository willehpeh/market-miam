import { CatalogueViewStore } from './catalogue-view.store';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { CatalogueEvent, ItemAddedToCatalogue, ItemPriceChanged, ItemRetired, ItemRevised } from '../catalogue/events';

@CheckpointedProjection('catalogue-view')
export class CatalogueViewProjection extends ProjectionFor<CatalogueEvent> {

  constructor(private readonly store: CatalogueViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<CatalogueEvent> {
    return {
      ItemAddedToCatalogue: e => this.handleItemAdded(e),
      ItemPriceChanged: e => this.handleItemPriceChanged(e),
      ItemRetired: e => this.handleItemRetired(e),
      ItemRevised: e => this.handleItemRevised(e)
    };
  }

  private async handleItemAdded(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemAddedToCatalogue['payload'];
    return this.store.addItemToCatalogue({
      itemId: payload.itemId,
      name: payload.name,
      description: payload.description,
      price: payload.price,
      imageReference: payload.imageReference ?? ''
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

  private handleItemRevised(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemRevised['payload'];
    return this.store.reviseItem(
      payload.itemId,
      { name: payload.name, description: payload.description, price: payload.price },
      vendorIdFrom(event),
    );
  }
}
