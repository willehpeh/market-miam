import { Price } from './price';
import { Variants } from './variants';
import { InvalidItemPricingError } from '../errors/invalid-item-pricing.error';
import { MismatchedPricingError } from '../errors/mismatched-pricing.error';

// What one dish costs at one market: a number for a flat dish, cents per variant name for
// a dish sold by variant (ADR 0052). Sparse — a variant it does not name keeps its
// catalogue price.
export type MarketPrice = number | Record<string, number>;

type PricingInput = { price?: number; variants?: { name: string; description: string; price: number }[] };

type PricingSnapshot = { price: number } | { variants: { name: string; description: string; price: number }[] };

// A dish is flat-priced or sold by variant, never both (ADR 0033), so the two kinds answer
// for themselves. One class holding a pair of optionals had to ask which it was every time
// — three times over once a market price had to be matched against it — and could only
// reach its own fields through non-null assertions.
export abstract class Pricing {
  static from(input: PricingInput): Pricing {
    if (input.price !== undefined && input.variants !== undefined) {
      throw new InvalidItemPricingError('An item cannot have both a price and variants');
    }
    if (input.variants !== undefined) {
      return new VariantPricing(Variants.fromInputs(input.variants));
    }
    if (input.price === undefined) {
      throw new InvalidItemPricingError('An item must have either a price or variants');
    }
    return new FlatPricing(new Price(input.price));
  }

  abstract confirmMatchedBy(price: MarketPrice): void;

  abstract value(): PricingSnapshot;
}

class FlatPricing extends Pricing {
  constructor(private readonly _price: Price) {
    super();
  }

  confirmMatchedBy(price: MarketPrice): void {
    if (typeof price !== 'number') {
      throw new MismatchedPricingError('A flat-priced dish cannot take a price per variant');
    }
  }

  value(): PricingSnapshot {
    return { price: this._price.value() };
  }
}

class VariantPricing extends Pricing {
  constructor(private readonly _variants: Variants) {
    super();
  }

  confirmMatchedBy(price: MarketPrice): void {
    if (typeof price === 'number') {
      throw new MismatchedPricingError('A dish sold by variant cannot take a single price');
    }
    this._variants.confirmNamed(Object.keys(price));
  }

  value(): PricingSnapshot {
    return { variants: this._variants.value() };
  }
}
