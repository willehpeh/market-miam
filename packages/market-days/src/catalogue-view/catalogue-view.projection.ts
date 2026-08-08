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

  reset(): Promise<void> {
    return this.store.clear();
  }

  private async handleItemAdded(event: StoredEvent<ItemAddedToCatalogue>): Promise<void> {
    const payload = event.payload;
    return this.store.addItemToCatalogue({
      itemId: payload.itemId,
      name: payload.name,
      description: payload.description,
      imageReference: payload.imageReference ?? '',
      ...(payload.variants ? { variants: payload.variants } : { price: payload.price })
    }, vendorIdFrom(event));
  }

  private handleItemRetired(event: StoredEvent<ItemRetired>): Promise<void> {
    return this.store.retireItem(event.payload.itemId, vendorIdFrom(event));
  }

  private handleItemRevised(event: StoredEvent<ItemRevised>): Promise<void> {
    const payload = event.payload;
    return this.store.reviseItem(
      payload.itemId,
      { name: payload.name, description: payload.description, price: payload.price, variants: payload.variants },
      vendorIdFrom(event),
    );
  }

  private handleItemsReordered(event: StoredEvent<ItemsReordered>): Promise<void> {
    return this.store.reorderItems(event.payload.itemIds, vendorIdFrom(event));
  }

  private handleItemPhotoChanged(event: StoredEvent<ItemPhotoChanged>): Promise<void> {
    const payload = event.payload;
    return this.store.updateItemPhoto(payload.itemId, payload.imageReference, vendorIdFrom(event));
  }
}
