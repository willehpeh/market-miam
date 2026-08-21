import { ItemId, ItemName, Price, MarketPrice } from '../../catalogue/item';

// What a vendor charges at one market: itemId → cents for a flat dish, variant name →
// cents for a variant one. Sparse — anything it does not name is sold at the catalogue
// price (ADR 0052).
export type PriceList = Record<string, MarketPrice>;

// Key order is not a change. A vendor re-submitting the same prices in a different order
// has repriced nothing, the same reason a reordered menu raises no event.
function sameSize(mine: object, theirs: object): boolean {
  return Object.keys(mine).length === Object.keys(theirs).length;
}

function samePrice(mine: number | Record<string, number>, theirs?: number | Record<string, number>): boolean {
  if (typeof mine === 'number' || typeof theirs === 'number' || theirs === undefined) {
    return mine === theirs;
  }
  return sameSize(mine, theirs) && Object.entries(mine).every(([name, price]) => price === theirs[name]);
}

// Validated on the way in, so what the list holds is already whole cents (ADR 0007).
function validated(price: MarketPrice): MarketPrice {
  return typeof price === 'number'
    ? new Price(price).value()
    : Object.fromEntries(Object.entries(price)
      .map(([name, cents]) => [new ItemName(name).value(), new Price(cents).value()]));
}

// A dish naming none of its variants says what leaving it out says — sold at catalogue
// prices — so it is dropped rather than stored. Keeping it would make two lists that mean
// the same thing compare unequal, and a vendor selecting a dish and typing nothing would
// land an event saying nothing.
function overridesSomething(price: MarketPrice): boolean {
  return typeof price === 'number' || Object.keys(price).length > 0;
}

export class MarketPrices {
  private readonly _prices: PriceList;

  constructor(prices: PriceList = {}) {
    this._prices = Object.fromEntries(
      Object.entries(prices)
        .map(([itemId, price]): [string, MarketPrice] => [itemId, validated(price)])
        .filter(([, price]) => overridesSomething(price)),
    );
  }

  equals(other: MarketPrices): boolean {
    return sameSize(this._prices, other._prices)
      && Object.entries(this._prices).every(([itemId, price]) => samePrice(price, other._prices[itemId]));
  }

  // Addressed the way the catalogue asks for them, so no caller has to take the list
  // apart to hand it over.
  byItem(): Map<ItemId, MarketPrice> {
    const byItem = new Map<ItemId, MarketPrice>();
    Object.entries(this._prices).forEach(([itemId, price]) => byItem.set(new ItemId(itemId), price));
    return byItem;
  }

  value(): PriceList {
    return { ...this._prices };
  }
}
