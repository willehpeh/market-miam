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
  let projection: CatalogueViewProjection;
  let subscription: PollingSubscription;

  beforeEach(() => {
    store = new InMemoryEventStore();
    views = new InMemoryCatalogueViews();
    projection = new CatalogueViewProjection(views);
    subscription = new PollingSubscription(store, projection, new InMemoryCheckpoint('catalogue-view'));
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
        { itemId: first.itemId, name: first.name, description: first.description, price: first.price, imageReference: first.imageReference, allergens: ['gluten', 'milk'] },
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference, allergens: ['gluten', 'milk'] },
      ],
    });
  });

  it('should project a variant item with its variants and no price', async () => {
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
          allergens: ['gluten', 'milk'],
        },
      ],
    });
  });

  it('should revise the item name, description and price, keeping its image', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: newItemCommand.itemId, vendorId: newItemCommand.vendorId, name: 'Revised Name', description: 'Revised Description', price: 999, allergens: ['gluten', 'milk'] }));

    await subscription.poll();
    const view = await views.forVendor(newItemCommand.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: 'Revised Name', description: 'Revised Description', price: 999, imageReference: newItemCommand.imageReference, allergens: ['gluten', 'milk'] },
      ],
    });
  });

  it('should revise a flat item into a variant item', async () => {
    const added = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Pizza', description: 'Wood-fired', allergens: ['gluten', 'milk'], variants: [
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
          allergens: ['gluten', 'milk'],
        },
      ],
    });
  });

  it('should revise a variant item back to a single price', async () => {
    const added = TestAddItemToCatalogue.withVariants([
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra hungry', price: 1200 },
    ]);
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Soup', description: 'Daily', price: 500, allergens: ['gluten', 'milk'] }));

    await subscription.poll();
    const view = await views.forVendor(added.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: added.itemId, name: 'Soup', description: 'Daily', price: 500, imageReference: added.imageReference, allergens: ['gluten', 'milk'] },
      ],
    });
  });

  it('projects the allergens an item declares, and their revision', async () => {
    const added = TestAddItemToCatalogue.with({ allergens: ['milk'] });
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await subscription.poll();
    expect((await views.forVendor(added.vendorId)).items[0].allergens).toEqual(['milk']);

    await new ReviseItemHandler(catalogues).execute(new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: added.name, description: added.description, price: added.price, allergens: [] }));
    await subscription.poll();

    expect((await views.forVendor(added.vendorId)).items[0].allergens).toEqual([]);
  });

  // Undeclared, not "none": an event from before allergens existed says nothing about them.
  it('projects an item added before allergens existed as undeclared', async () => {
    store.seedWith('catalogue-vendor-id', [
      { type: 'ItemAddedToCatalogue', payload: { itemId: 'old', name: 'Tarte tatin', description: 'Aux pommes', price: 600 }, version: 1 },
    ], { vendorId: 'vendor-id' });

    await subscription.poll();

    expect((await views.forVendor('vendor-id')).items[0].allergens).toBeNull();
  });

  it('should change the item photo, keeping its other fields', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await new ChangeItemPhotoHandler(catalogues).execute(new ChangeItemPhoto(newItemCommand.itemId, newItemCommand.vendorId, 'v9/dishes/vendor-id/item-id'));

    await subscription.poll();
    const view = await views.forVendor(newItemCommand.vendorId);
    expect(view).toEqual({
      items: [
        { itemId: newItemCommand.itemId, name: newItemCommand.name, description: newItemCommand.description, price: newItemCommand.price, imageReference: 'v9/dishes/vendor-id/item-id', allergens: ['gluten', 'milk'] },
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
        { itemId: second.itemId, name: second.name, description: second.description, price: second.price, imageReference: second.imageReference, allergens: ['gluten', 'milk'] }
      ],
    })
  });

  it('resets by clearing the read model so a replay rebuilds it from zero', async () => {
    const { vendorId } = await addTwoItems(catalogues);
    await subscription.poll();
    expect((await views.forVendor(vendorId)).items).toHaveLength(2);

    await projection.reset();

    expect(await views.forVendor(vendorId)).toEqual({ items: [] });
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
