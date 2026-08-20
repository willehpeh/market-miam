import { ItemId } from '../catalogue';
import { ItemOutcome } from './events';
import { Menu } from './menu';

// The bilan the day currently carries. Replaced whole rather than added to (decision 72),
// which is why it answers `equals` the way Menu does rather than holding a per-item verb.
export class ItemOutcomes {
  private readonly _byItemId: ReadonlyMap<string, ItemOutcome>;

  constructor(outcomes: Record<string, ItemOutcome> = {}) {
    this._byItemId = new Map(Object.entries(outcomes));
  }

  keptBy(menu: Menu): ItemOutcomes {
    return new ItemOutcomes(Object.fromEntries(
      [...this._byItemId].filter(([itemId]) => menu.includes(new ItemId(itemId))),
    ));
  }

  everyItemOn(menu: Menu): boolean {
    return [...this._byItemId.keys()].every(itemId => menu.includes(new ItemId(itemId)));
  }

  equals(other: ItemOutcomes): boolean {
    return this._byItemId.size === other._byItemId.size
      && [...this._byItemId].every(([itemId, outcome]) => other._byItemId.get(itemId) === outcome);
  }

  value(): Record<string, ItemOutcome> {
    return Object.fromEntries(this._byItemId);
  }
}
