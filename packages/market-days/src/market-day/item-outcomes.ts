import { ItemId } from '../catalogue';
import { ItemOutcome } from './events';
import { Menu } from './menu';

// What the vendor has said about each dish so far. Mirrors SoldOutItems: the aggregate
// holds it only to know what a command would change (decision 66).
export class ItemOutcomes {
  constructor(private readonly _byItemId: ReadonlyMap<string, ItemOutcome> = new Map()) {}

  with(itemId: ItemId, outcome: ItemOutcome): ItemOutcomes {
    return new ItemOutcomes(new Map(this._byItemId).set(itemId.value(), outcome));
  }

  keptBy(menu: Menu): ItemOutcomes {
    return new ItemOutcomes(
      new Map([...this._byItemId].filter(([itemId]) => menu.includes(new ItemId(itemId)))),
    );
  }

  alreadySay(itemId: ItemId, outcome: ItemOutcome): boolean {
    return this._byItemId.get(itemId.value()) === outcome;
  }
}
