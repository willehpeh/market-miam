import { InMemoryEventStore } from '../../in-memory.event-store';
import { EditStorefrontInformation, EditStorefrontInformationHandler, Storefronts } from '@market-monster/market-days';
import { EmptyValueError } from '@market-monster/common';

describe('Edit Storefront Information', () => {
  let store: InMemoryEventStore;
  let storefronts: Storefronts;
  let handler: EditStorefrontInformationHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    storefronts = new Storefronts(store);
    handler = new EditStorefrontInformationHandler(storefronts);
  });

  it('should set storefront information when none was set previously', async () => {
    const command = new EditStorefrontInformation(
      'vendor-id',
      'Jimmy\'s Sandwiches',
      'The best you ever had'
    );
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

  it('should prevent an empty name', async () => {
    const command = new EditStorefrontInformation(
      'vendor-id',
      '',
      'The best you ever had'
    );
    await expect(handler.execute(command)).rejects.toThrow(EmptyValueError);
  });

  it('should trim name and description whitespace', async () => {
    const command = new EditStorefrontInformation(
      'vendor-id',
      '  Thai Fried Chicken  ',
      '  Better than KFC  '
    );
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
});
