import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { AddItemToCatalogueHandler, Catalogues, InvalidDishPricingError, NoSuchItemError, RetireItem, RetireItemHandler, ReviseItem, ReviseItemHandler } from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestReviseItem } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Revise item', () => {
  let store: InMemoryEventStore;
  let catalogues: Catalogues;
  let handler: ReviseItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ReviseItemHandler(catalogues);
  });

  it('should revise the name, description and price of an existing item', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);

    const command = new ReviseItem({ itemId: newItemCommand.itemId, vendorId: newItemCommand.vendorId, name: 'Revised Name', description: 'Revised Description', price: 750 });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemRevised',
        payload: {
          itemId: command.itemId,
          name: 'Revised Name',
          description: 'Revised Description',
          price: 750
        }
      })
    ]);
  });

  it('revises a flat dish into a variant dish (variants, no price)', async () => {
    const added = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(added);

    await handler.execute(TestReviseItem.withVariants(added.itemId, [
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra', price: 1200 },
    ]));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemRevised',
        payload: {
          itemId: added.itemId,
          name: 'Revised Name',
          description: 'Revised Description',
          variants: [
            { name: 'Small', description: '', price: 800 },
            { name: 'Large', description: 'extra', price: 1200 },
          ],
        },
      }),
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    const newItemCommand = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(newItemCommand);
    await handler.execute(TestReviseItem.valid());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  describe('rejects an invalid pricing shape', () => {
    it('rejects revising to both a price and variants', async () => {
      const added = TestAddItemToCatalogue.simple();
      await new AddItemToCatalogueHandler(catalogues).execute(added);

      const command = new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Revised Name', description: 'Revised Description', price: 500, variants: [
        { name: 'Small', description: '', price: 800 },
        { name: 'Large', description: '', price: 1200 },
      ] });

      await expect(handler.execute(command)).rejects.toThrow(InvalidDishPricingError);
      expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'ItemAddedToCatalogue' })]);
    });

    it('rejects revising to neither a price nor variants', async () => {
      const added = TestAddItemToCatalogue.simple();
      await new AddItemToCatalogueHandler(catalogues).execute(added);

      const command = new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Revised Name', description: 'Revised Description' });

      await expect(handler.execute(command)).rejects.toThrow(InvalidDishPricingError);
      expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'ItemAddedToCatalogue' })]);
    });
  });

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestReviseItem.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });

  it('should fail if the item has been retired', async () => {
    const added = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await new RetireItemHandler(catalogues).execute(new RetireItem(added.vendorId, added.itemId));

    const command = new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Revised Name', description: 'Revised Description', price: 750 });

    await expect(handler.execute(command)).rejects.toThrow(NoSuchItemError);
  });
});
