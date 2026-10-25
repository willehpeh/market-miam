import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { VendorId } from '@market-miam/shared-kernel';
import { InMemoryEventStore } from '@market-miam/event-sourcing';
import { AddItemToCatalogueHandler, Catalogues, InvalidItemPricingError, NoSuchItemError, RetireItem, RetireItemHandler, ReviseItem, ReviseItemHandler } from '@market-miam/market-days';
import { TestAddItemToCatalogue } from '../add-item-to-catalogue/test-data';
import { TestReviseItem } from './test-data';

describe('Revise Item', () => {
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

    const command = new ReviseItem({ itemId: newItemCommand.itemId, vendorId: newItemCommand.vendorId, name: 'Revised Name', description: 'Revised Description', price: 750, allergens: ['eggs'] });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemRevised',
        payload: {
          itemId: command.itemId,
          name: 'Revised Name',
          description: 'Revised Description',
          price: 750,
          allergens: ['eggs'],
        }
      })
    ]);
  });

  it('revises a flat item into a variant item (variants, no price)', async () => {
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
          allergens: ['gluten', 'milk'],
        },
      }),
    ]);
  });

  describe('allergens (INCO 1169/2011)', () => {
    it('revises an item whose allergens alone change', async () => {
      const added = TestAddItemToCatalogue.simple();
      await new AddItemToCatalogueHandler(catalogues).execute(added);
      const unchangedButAllergens = { itemId: added.itemId, name: added.name, description: added.description, price: added.price };

      await handler.execute(TestReviseItem.with({ ...unchangedButAllergens, allergens: ['gluten', 'milk', 'eggs'] }));

      expect(store.newEvents()).toEqual([
        expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
        expect.objectContaining({ type: 'ItemRevised', payload: expect.objectContaining({ allergens: ['gluten', 'eggs', 'milk'] }) }),
      ]);
    });

    it('raises nothing when the allergens are ticked again in another order', async () => {
      const added = TestAddItemToCatalogue.simple();
      await new AddItemToCatalogueHandler(catalogues).execute(added);

      await handler.execute(TestReviseItem.with({ itemId: added.itemId, name: added.name, description: added.description, price: added.price, allergens: ['milk', 'gluten'] }));

      expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'ItemAddedToCatalogue' })]);
    });

    // Decision 4 of ALLERGENS-PLAN.md: undeclared is not "none", so declaring them is a change
    // even when nothing else is.
    it('revises an item added before allergens existed once they are declared', async () => {
      store.seedWith('catalogue-vendor-id', [
        { type: 'ItemAddedToCatalogue', payload: { itemId: 'old', name: 'Tarte tatin', description: 'Aux pommes', price: 600 }, version: 1 },
      ], { vendorId: 'vendor-id' });

      await handler.execute(TestReviseItem.with({ itemId: 'old', name: 'Tarte tatin', description: 'Aux pommes', price: 600, allergens: [] }));

      expect(store.newEvents()).toEqual([
        expect.objectContaining({ type: 'ItemRevised', payload: expect.objectContaining({ itemId: 'old', allergens: [] }) }),
      ]);
    });
  });

  // Name and description kept, so only how the dish is priced differs: the kind of pricing
  // alone has to count as a change.
  it.each([
    {
      scenario: 'a flat item into a variant item',
      added: TestAddItemToCatalogue.simple(),
      pricing: { variants: [{ name: 'Small', description: '', price: 800 }, { name: 'Large', description: 'extra', price: 1200 }] },
    },
    {
      scenario: 'a variant item into a flat item',
      added: TestAddItemToCatalogue.withVariants([{ name: 'Small', description: '', price: 800 }, { name: 'Large', description: 'extra', price: 1200 }]),
      pricing: { price: 800 },
    },
  ])('revises $scenario when nothing but the pricing changes', async ({ added, pricing }) => {
    await new AddItemToCatalogueHandler(catalogues).execute(added);

    await handler.execute(new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: added.name, description: added.description, allergens: added.allergens, ...pricing }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({
        type: 'ItemRevised',
        payload: { itemId: added.itemId, name: added.name, description: added.description, allergens: added.allergens, ...pricing },
      }),
    ]);
  });

  // A re-statement, not a change: the stance setMenu, setCoverPhoto and setMarketPrices
  // already take. The edit form is saved whole, so saving it untouched must not put a
  // second copy of the dish in the log — that is the one growth of the catalogue stream
  // the vendor never asked for.
  it('raises nothing when the revision changes nothing', async () => {
    const added = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    await handler.execute(TestReviseItem.with({ itemId: added.itemId }));

    await handler.execute(TestReviseItem.with({ itemId: added.itemId }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemRevised' }),
    ]);
  });

  // Fresh commands with equal content, not the same object twice: the variants are compared
  // by what they say, and in the order they say it.
  it('raises nothing when the variant revision changes nothing', async () => {
    const added = TestAddItemToCatalogue.simple();
    await new AddItemToCatalogueHandler(catalogues).execute(added);
    const variants = () => [
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra', price: 1200 },
    ];
    await handler.execute(TestReviseItem.withVariants(added.itemId, variants()));

    await handler.execute(TestReviseItem.withVariants(added.itemId, variants()));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({ type: 'ItemAddedToCatalogue' }),
      expect.objectContaining({ type: 'ItemRevised' }),
    ]);
  });

  describe('rejects an invalid pricing shape', () => {
    it('rejects revising to both a price and variants', async () => {
      const added = TestAddItemToCatalogue.simple();
      await new AddItemToCatalogueHandler(catalogues).execute(added);

      const command = new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Revised Name', description: 'Revised Description', allergens: [], price: 500, variants: [
        { name: 'Small', description: '', price: 800 },
        { name: 'Large', description: '', price: 1200 },
      ] });

      await expect(handler.execute(command)).rejects.toThrow(InvalidItemPricingError);
      expect(store.newEvents()).toEqual([expect.objectContaining({ type: 'ItemAddedToCatalogue' })]);
    });

    it('rejects revising to neither a price nor variants', async () => {
      const added = TestAddItemToCatalogue.simple();
      await new AddItemToCatalogueHandler(catalogues).execute(added);

      const command = new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Revised Name', description: 'Revised Description', allergens: [] });

      await expect(handler.execute(command)).rejects.toThrow(InvalidItemPricingError);
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

    const command = new ReviseItem({ itemId: added.itemId, vendorId: added.vendorId, name: 'Revised Name', description: 'Revised Description', price: 750, allergens: [] });

    await expect(handler.execute(command)).rejects.toThrow(NoSuchItemError);
  });

  // The command path cannot produce this — reviseItem asserts the item exists first — so
  // this is the rehydration guard: a stream that revises an item it never added fails
  // loudly rather than constituting a catalogue with a hole in it.
  it('refuses to rehydrate a catalogue whose stream revises an item it never added', async () => {
    store.seedWith('catalogue-vendor-id', [{
      type: 'ItemRevised',
      payload: { itemId: 'never-added', name: 'Ghost', description: '', price: 500 },
      version: 1,
    }], { vendorId: 'vendor-id' });

    await expect(catalogues.forVendor(new VendorId('vendor-id'))).rejects.toThrow(NoSuchItemError);
  });
});
