import {
  AddItemToCatalogueHandler,
  InvalidPriceError,
  ItemAddedToCatalogue,
  ItemAlreadyInCatalogueError,
  Catalogues,
  VendorScopedEvents
} from '@market-miam/market-days';
import { EmptyValueError } from '@market-miam/common';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { TestAddItemToCatalogue } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('AddItemToCatalogue', () => {
  let store: InMemoryEventStore;
  let handler: AddItemToCatalogueHandler;
  let catalogues: Catalogues;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new AddItemToCatalogueHandler(catalogues);
  });

  it('should add the item to the catalogue', async () => {
    const command = TestAddItemToCatalogue.simple();

    await handler.execute(command);

    const expectedEvent: ItemAddedToCatalogue = {
      type: 'ItemAddedToCatalogue',
      payload: {
        itemId: command.itemId,
        name: command.name,
        description: command.description,
        price: command.price,
        imageReference: command.imageReference,
      },
      version: 1,
    };
    expect(store.newEvents()).toEqual([expect.objectContaining(expectedEvent)]);
  });

  it('adds a dish with variants and no dish-level price', async () => {
    const command = TestAddItemToCatalogue.withVariants([
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra hungry', price: 1200 },
    ]);

    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemAddedToCatalogue',
        version: 1,
        payload: {
          itemId: command.itemId,
          name: command.name,
          description: command.description,
          variants: [
            { name: 'Small', description: '', price: 800 },
            { name: 'Large', description: 'extra hungry', price: 1200 },
          ],
          imageReference: command.imageReference,
        },
      }),
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    await handler.execute(TestAddItemToCatalogue.simple());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it('should allow free items', async () => {
    await handler.execute(TestAddItemToCatalogue.with({ price: 0 }));

    expect(store.newEvents()).toHaveLength(1);
    expect(store.newEvents()[0].payload['price']).toBe(0);
  });

  it('should allow an empty description', async () => {
    await handler.execute(TestAddItemToCatalogue.with({ description: '' }));

    expect(store.newEvents()).toHaveLength(1);
    expect(store.newEvents()[0].payload['description']).toBe('');
  });

  it('should allow an item with no image', async () => {
    await handler.execute(TestAddItemToCatalogue.with({ imageReference: '' }));

    expect(store.newEvents()).toHaveLength(1);
    expect(store.newEvents()[0].payload['imageReference']).toBeUndefined();
  });

  it('should add a new item to an existing catalogue', async () => {
    await handler.execute(TestAddItemToCatalogue.simple());
    await handler.execute(TestAddItemToCatalogue.with({ itemId: 'another-item-id', name: 'new-name' }));

    expect(store.newEvents()).toHaveLength(2);
    expect(store.newEvents()[1].payload['name']).toBe('new-name');
  });

  it('should reject adding an item whose ID is already in the catalogue', async () => {
    await handler.execute(TestAddItemToCatalogue.simple());

    await expect(
      handler.execute(TestAddItemToCatalogue.with({ name: 'different-name' }))
    ).rejects.toThrow(ItemAlreadyInCatalogueError);

    expect(store.newEvents()).toHaveLength(1);
  });

  describe('rejects invalid input', () => {
    it.each([
      '',
      '   ',
    ])('should reject an empty item ID: "%s"', async (itemId) => {
      await expect(handler.execute(TestAddItemToCatalogue.with({ itemId }))).rejects.toThrow(EmptyValueError);
      expect(store.newEvents()).toEqual([]);
    });

    it.each([
      '',
      '   ',
    ])('should reject an empty item name: "%s"', async (name) => {
      await expect(handler.execute(TestAddItemToCatalogue.with({ name }))).rejects.toThrow(EmptyValueError);
      expect(store.newEvents()).toEqual([]);
    });

    it('should reject a negative price', async () => {
      await expect(handler.execute(TestAddItemToCatalogue.with({ price: -100 }))).rejects.toThrow(InvalidPriceError);
      expect(store.newEvents()).toEqual([]);
    });

    it('should reject a fractional price (cents are whole numbers)', async () => {
      await expect(handler.execute(TestAddItemToCatalogue.with({ price: 12.5 }))).rejects.toThrow(InvalidPriceError);
      expect(store.newEvents()).toEqual([]);
    });

  });
});
