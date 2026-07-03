import { InMemoryEventStore } from '@market-monster/event-sourcing';
import { VendorScopedEvents } from '@market-monster/market-days';
import { EditStorefrontInformationHandler, StorefrontNotOpenError, Storefronts } from '@market-monster/market-days';
import { EmptyValueError } from '@market-monster/common';
import { TestEditStorefrontInformation } from './test-data';
import { expectVendorScopedEvents } from '../../shared-kernel';

describe('Edit Storefront Information', () => {
  let store: InMemoryEventStore;
  let storefronts: Storefronts;
  let handler: EditStorefrontInformationHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new Storefronts(new VendorScopedEvents(store));
    handler = new EditStorefrontInformationHandler(storefronts);
  });

  it('rejects editing a storefront that has not been opened', async () => {
    await expect(handler.execute(TestEditStorefrontInformation.valid())).rejects.toThrow(StorefrontNotOpenError);
  });

  it('should set storefront information when none was set previously', async () => {
    openStorefront();
    const command = TestEditStorefrontInformation.valid();
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'StorefrontInformationEdited',
        payload: {
          name: command.name,
          description: command.description
        }
      })
    ]);
  });

  it('stamps the vendor id into the event metadata', async () => {
    openStorefront();
    await handler.execute(TestEditStorefrontInformation.valid());

    expectVendorScopedEvents(store.newEvents(), 'vendor-id');
  });

  it('should prevent an empty name', async () => {
    const command = TestEditStorefrontInformation.with({ name: '' });
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it('should trim name and description whitespace', async () => {
    openStorefront();
    const command = TestEditStorefrontInformation.with({
      name: '  Thai Fried Chicken  ',
      description: '  Better than KFC  '
    });
    await handler.execute(command);

    expect(store.newEvents()).toEqual([
      expect.objectContaining({
        type: 'StorefrontInformationEdited',
        payload: {
          name: 'Thai Fried Chicken',
          description: 'Better than KFC'
        }
      })
    ]);
  });

  function openStorefront() {
    store.seedWith('storefront-vendor-id', [{ type: 'StorefrontOpened', payload: { vendorId: 'vendor-id' }, version: 1 }], { vendorId: 'vendor-id' });
  }
});
