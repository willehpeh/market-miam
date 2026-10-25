import { describe } from 'vitest';
import { VendorScopedEvents } from '@market-miam/market-days';
import { VendorId } from '@market-miam/shared-kernel';
import { DomainEvent, InMemoryEventStore } from '@market-miam/event-sourcing';
import { Catalogues, InvalidItemPricingError, NoSuchItemError, ReviseItem, ReviseItemHandler } from '@market-miam/market-days';
import { catalogueStream, itemAdded, itemRetired, itemRevised } from '../catalogue-events';
import { TestReviseItem } from './test-data';

describe('Revise Item', () => {
  let store: InMemoryEventStore;
  let given: (...history: DomainEvent[]) => void;
  let catalogues: Catalogues;
  let handler: ReviseItemHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    given = (...history) => store.seedWith(catalogueStream(), history, { vendorId: 'vendor-id' });
    catalogues = new Catalogues(new VendorScopedEvents(store));
    handler = new ReviseItemHandler(catalogues);
  });

  it('should revise the name, description and price of an existing item', async () => {
    given(itemAdded());

    const command = new ReviseItem({ itemId: 'item-id', vendorId: 'vendor-id', name: 'Revised Name', description: 'Revised Description', price: 750, allergens: ['eggs'] });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
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
    given(itemAdded());

    await handler.execute(TestReviseItem.withVariants('item-id', [
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra', price: 1200 },
    ]));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemRevised',
        payload: {
          itemId: 'item-id',
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
      const added = itemAdded();
      given(added);
      const unchangedButAllergens = { itemId: added.payload.itemId, name: added.payload.name, description: added.payload.description, price: added.payload.price };

      await handler.execute(TestReviseItem.with({ ...unchangedButAllergens, allergens: ['gluten', 'milk', 'eggs'] }));

      expect(store.newEvents()).toEqual([
        expect.objectContaining({ type: 'ItemRevised', payload: expect.objectContaining({ allergens: ['gluten', 'eggs', 'milk'] }) }),
      ]);
    });

    it('raises nothing when the allergens are ticked again in another order', async () => {
      const added = itemAdded();
      given(added);

      await handler.execute(TestReviseItem.with({ itemId: added.payload.itemId, name: added.payload.name, description: added.payload.description, price: added.payload.price, allergens: ['milk', 'gluten'] }));

      expect(store.newEvents()).toEqual([]);
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
      added: itemAdded(),
      pricing: { variants: [{ name: 'Small', description: '', price: 800 }, { name: 'Large', description: 'extra', price: 1200 }] },
    },
    {
      scenario: 'a variant item into a flat item',
      added: itemAdded('item-id', { price: undefined, variants: [{ name: 'Small', description: '', price: 800 }, { name: 'Large', description: 'extra', price: 1200 }] }),
      pricing: { price: 800 },
    },
  ])('revises $scenario when nothing but the pricing changes', async ({ added, pricing }) => {
    given(added);
    const { itemId, name, description } = added.payload;
    const allergens = ['gluten', 'milk'];

    await handler.execute(new ReviseItem({ itemId, vendorId: 'vendor-id', name, description, allergens, ...pricing }));

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'ItemRevised',
        payload: { itemId, name, description, allergens, ...pricing },
      }),
    ]);
  });

  // A re-statement, not a change: the stance setMenu, setCoverPhoto and setMarketPrices
  // already take. The edit form is saved whole, so saving it untouched must not put a
  // second copy of the dish in the log — that is the one growth of the catalogue stream
  // the vendor never asked for.
  it('raises nothing when the revision changes nothing', async () => {
    given(itemAdded(), itemRevised('item-id', { name: 'Revised Name', description: 'Revised Description', price: 750 }));

    await handler.execute(TestReviseItem.with({ itemId: 'item-id' }));

    expect(store.newEvents()).toEqual([]);
  });

  // Fresh commands with equal content, not the same object twice: the variants are compared
  // by what they say, and in the order they say it.
  it('raises nothing when the variant revision changes nothing', async () => {
    const variants = () => [
      { name: 'Small', description: '', price: 800 },
      { name: 'Large', description: 'extra', price: 1200 },
    ];
    given(itemAdded(), itemRevised('item-id', { name: 'Revised Name', description: 'Revised Description', price: undefined, variants: variants() }));

    await handler.execute(TestReviseItem.withVariants('item-id', variants()));

    expect(store.newEvents()).toEqual([]);
  });

  describe('rejects an invalid pricing shape', () => {
    it('rejects revising to both a price and variants', async () => {
      given(itemAdded());

      const command = new ReviseItem({ itemId: 'item-id', vendorId: 'vendor-id', name: 'Revised Name', description: 'Revised Description', allergens: [], price: 500, variants: [
        { name: 'Small', description: '', price: 800 },
        { name: 'Large', description: '', price: 1200 },
      ] });

      await expect(handler.execute(command)).rejects.toThrow(InvalidItemPricingError);
      expect(store.newEvents()).toEqual([]);
    });

    it('rejects revising to neither a price nor variants', async () => {
      given(itemAdded());

      const command = new ReviseItem({ itemId: 'item-id', vendorId: 'vendor-id', name: 'Revised Name', description: 'Revised Description', allergens: [] });

      await expect(handler.execute(command)).rejects.toThrow(InvalidItemPricingError);
      expect(store.newEvents()).toEqual([]);
    });
  });

  it('should fail and raise no events if the item does not exist', async () => {
    const command = TestReviseItem.valid();
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
    expect(store.newEvents()).toEqual([]);
  });

  it('should fail if the item has been retired', async () => {
    given(itemAdded(), itemRetired());

    const command = new ReviseItem({ itemId: 'item-id', vendorId: 'vendor-id', name: 'Revised Name', description: 'Revised Description', price: 750, allergens: [] });

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
