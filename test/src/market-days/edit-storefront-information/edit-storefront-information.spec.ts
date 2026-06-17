import { InMemoryEventStore } from '../../in-memory.event-store';
import { StorefrontDescription, StorefrontName, Storefronts } from '@market-monster/market-days';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-monster/shared-kernel';
import { EmptyValueError } from '@market-monster/common';

export class EditStorefrontInformation extends Command<void> {
  constructor(public readonly vendorId: string,
              public readonly name: string,
              public readonly description: string) {
    super();
  }

}

@CommandHandler(EditStorefrontInformation)
export class EditStorefrontInformationHandler implements ICommandHandler<EditStorefrontInformation> {
  constructor(private readonly storefronts: Storefronts) {
  }

  async execute(command: EditStorefrontInformation): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    storefront.editInformation(new StorefrontName(command.name), new StorefrontDescription(command.description));
    await this.storefronts.save(storefront, vendorId);
  }

}

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
