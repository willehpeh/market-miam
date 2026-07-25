import { VendorScopedEvents } from '@market-miam/market-days';
import {
  AddItemToCatalogueHandler,
  Catalogues,
  CatalogueViewProjection,
  ChangeItemPhoto,
  ChangeItemPhotoHandler,
  InMemoryCatalogueViews,
  ReviseItem,
  ReviseItemHandler,
  RetireItemHandler
} from '@market-miam/market-days';
import {
  InMemoryCheckpoint,
  InMemoryEventStore,
  PollingSubscription,
} from '@market-miam/event-sourcing';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';


describe('CatalogueView', () => {
  let store: InMemoryEventStore;
  let views: InMemoryCatalogueViews;
  let catalogues: Catalogues;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryCatalogueViews();
    subscription = new PollingSubscription(store, new CatalogueViewProjection(views), new InMemoryCheckpoint('catalogue-view'));
    catalogues = new Catalogues(new VendorScopedEvents(store));
  });

  it('should return an empty catalogue when none are added', async () => {
    await subscription.poll();
    const view = await views.forVendor('vendor-id');
    expect(view).toEqual({ items: [] });
  });

  it('should project items added to the catalogue', async () => {
    const { first, second, vendorId } = await addTwoItems(catalogues);

    await subscription.poll();

    const view = await views.forVendor(vendorId);
    expect(view).toEqual({
      items: [
        { itemId: first.itemId, name: first.name, description: first.description, price: first.price, imageReference: first.imageReference },
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference },
      ],
    });
  });

  it('should project a variant dish with its variants and no price', async () => {
    const command = TestAddItemToCatalogue.withVariants([
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra hungry', price: 1200 },
    ]);
    await new AddItemToCatalogueHandler(catalogues).execute(command);

    await subscription.poll();

    const view = await views.forVendor(command.vendorId);
    expect(view).toEqual({
      items: [
        {
          itemId: command.itemId,
          name: command.name,
          description: command.description,
          variants: [
            { name: 'Small', description: '', price: 800 },
            { name: 'Large', description: 'extra hungry', price: 1200 },
          ],
          imageReference: command.imageReference,
        },
      ],
    });
  });

  it('should revise the item name, description and price, keeping its image', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: newItemCommand.itemId, vendorId: newItemCommand.vendorId, name: 'Revised Name', description: 'Revised Description', price: 999 }));

    await subscription.poll();
    const view = await views.forVendor(newItemCommand.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: 'Revised Name', description: 'Revised Description', price: 999, imageReference: newItemCommand.imageReference },
      ],
    });
  });

  it('should revise a flat dish into a variant dish', async () => {
    const added = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Pizza', description: 'Wood-fired', variants: [
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra hungry', price: 1200 },
    ] }));

    await subscription.poll();
    const view = await views.forVendor(added.vendorId);
    expect(view).toEqual({
      items: [
        {
          itemId: added.itemId,
          name: 'Pizza',
          description: 'Wood-fired',
          variants: [
            { name: 'Small', description: '', price: 800 },
            { name: 'Large', description: 'extra hungry', price: 1200 },
          ],
          imageReference: added.imageReference,
        },
      ],
    });
  });

  it('should revise a variant dish back to a single price', async () => {
    const added = TestAddItemToCatalogue.withVariants([
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra hungry', price: 1200 },
    ]);
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Soup', description: 'Daily', price: 500 }));

    await subscription.poll();
    const view = await views.forVendor(added.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: added.itemId, name: 'Soup', description: 'Daily', price: 500, imageReference: added.imageReference },
      ],
    });
  });

  it('should change the item photo, keeping its other fields', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await new ChangeItemPhotoHandler(catalogues).execute(new ChangeItemPhoto(newItemCommand.itemId, newItemCommand.vendorId, 'v9/dishes/vendor-id/item-id'));

    await subscription.poll();
    const view = await views.forVendor(newItemCommand.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: newItemCommand.name, description: newItemCommand.description, price: newItemCommand.price, imageReference: 'v9/dishes/vendor-id/item-id' },
      ],
    });
  });

  it('should retire the item', async () => {
    const { first, second, vendorId } = await addTwoItems(catalogues);
    await new RetireItemHandler(catalogues).execute(first);

    await subscription.poll();
    const view = await views.forVendor(vendorId);
    expect(view).toEqual({
      items: [
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference }
      ],
    })
  });
});

async function addTwoItems(catalogues: Catalogues) {
  const first = TestAddItemToCatalogue.simple();
  const second = TestAddItemToCatalogue.with({ itemId: 'second-item', name: 'Second Item' });
  const vendorId = first.vendorId;
  const addItemHandler = new AddItemToCatalogueHandler(catalogues);
  await addItemHandler.execute(first);
  await addItemHandler.execute(second);
  return { first, second, vendorId };
}
