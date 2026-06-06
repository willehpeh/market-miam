import { InMemoryEventStore } from '../../in-memory.event-store';
import {
  AddItemToRepertoireHandler,
  ItemId,
  ItemPrice,
  ItemPriceChanged,
  NoSuchItemError,
  Repertoires
} from '@market-monster/market-days';
import { TestAddItemToRepertoire } from '../add-item-to-repertoire/test-data';
import { Command, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-monster/shared-kernel';

class ChangeItemPrice extends Command<void> {
  constructor(readonly itemId: string,
              readonly number: number,
              readonly vendorId: string) {
    super();
  }
}

@CommandHandler(ChangeItemPrice)
class ChangeItemPriceHandler implements ICommandHandler<ChangeItemPrice> {
  constructor(private readonly repertoires: Repertoires) {
  }

  async execute(command: ChangeItemPrice): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const repertoire = await this.repertoires.forVendor(vendorId);
    repertoire.changeItemPrice(
      new ItemId(command.itemId),
      new ItemPrice(command.number),
    );
    await this.repertoires.save(repertoire, vendorId);
  }
}

describe('Change Item Price', () => {
  let store: InMemoryEventStore;
  let repertoires: Repertoires;
  let handler: ChangeItemPriceHandler;

  beforeEach(() => {
    store = new InMemoryEventStore();
    repertoires = new Repertoires(store);
    handler = new ChangeItemPriceHandler(repertoires);
  });

  it('should change the price of an existing item', async () => {
    const baseItem = TestAddItemToRepertoire.valid();
    await new AddItemToRepertoireHandler(repertoires).execute(baseItem);

    const command = new ChangeItemPrice(baseItem.itemId, baseItem.price + 20, baseItem.vendorId);
    await handler.execute(command);

    const actual = store.lastEvent();
    const expected: ItemPriceChanged = {
      type: "ItemPriceChanged",
      payload: {
        itemId: baseItem.itemId,
        price: baseItem.price + 20
      }
    };
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it('should change the price multiple times', async () => {
    const baseItem = TestAddItemToRepertoire.valid();
    await new AddItemToRepertoireHandler(repertoires).execute(baseItem);

    const command = new ChangeItemPrice(baseItem.itemId, baseItem.price + 20, baseItem.vendorId);
    await handler.execute(command);

    const newCommand = new ChangeItemPrice(baseItem.itemId, baseItem.price + 40, baseItem.vendorId);
    await handler.execute(newCommand);

    const actual = store.lastEvent();
    const expected: ItemPriceChanged = {
      type: "ItemPriceChanged",
      payload: {
        itemId: baseItem.itemId,
        price: baseItem.price + 40
      }
    };
    expect(actual).toEqual(expect.objectContaining(expected));
  });

  it('should reject an inexistent item', async () => {
    const baseItem = TestAddItemToRepertoire.valid();
    await new AddItemToRepertoireHandler(repertoires).execute(baseItem);

    const command = new ChangeItemPrice('incorrect-id', baseItem.price + 20, baseItem.vendorId);
    await expect(() => handler.execute(command)).rejects.toThrow(NoSuchItemError);
  });
});

