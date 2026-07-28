import { CatalogueViewStore } from './catalogue-view.store';
import { CheckpointedProjection, EventHandlerMap, ProjectionFor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { CatalogueEvent, ItemAddedToCatalogue, ItemRetired, ItemRevised, ItemPhotoChanged, ItemsReordered } from '../catalogue/events';

@CheckpointedProjection('catalogue-view')
export class CatalogueViewProjection extends ProjectionFor<CatalogueEvent> {

  constructor(private readonly store: CatalogueViewStore) {
    super();
  }

  protected handlers(): EventHandlerMap<CatalogueEvent> {
    return {
      ItemAddedToCatalogue: e => this.handleItemAdded(e),
      ItemRetired: e => this.handleItemRetired(e),
      ItemRevised: e => this.handleItemRevised(e),
      ItemPhotoChanged: e => this.handleItemPhotoChanged(e),
      ItemsReordered: e => this.handleItemsReordered(e)
    };
  }

  private async handleItemAdded(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemAddedToCatalogue['payload'];
    return this.store.addItemToCatalogue({
      itemId: payload.itemId,
      name: payload.name,
      description: payload.description,
      imageReference: payload.imageReference ?? '',
      ...(payload.variants ? { variants: payload.variants } : { price: payload.price })
    }, vendorIdFrom(event));
  }

  private handleItemRetired(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemRetired['payload'];
    return this.store.retireItem(payload.itemId, vendorIdFrom(event));
  }

  private handleItemRevised(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemRevised['payload'];
    return this.store.reviseItem(
      payload.itemId,
      { name: payload.name, description: payload.description, price: payload.price, variants: payload.variants },
      vendorIdFrom(event),
    );
  }

  private handleItemsReordered(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemsReordered['payload'];
    return this.store.reorderItems(payload.itemIds, vendorIdFrom(event));
  }

  private handleItemPhotoChanged(event: StoredEvent): Promise<void> {
    const payload = event.payload as ItemPhotoChanged['payload'];
    return this.store.updateItemPhoto(payload.itemId, payload.imageReference, vendorIdFrom(event));
  }
}
