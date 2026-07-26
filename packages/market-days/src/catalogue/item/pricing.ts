import { ItemPrice } from './item-price';
import { Variants } from './variants';
import { InvalidDishPricingError } from '../errors/invalid-dish-pricing.error';

type PricingInput = { price?: number; variants?: { name: string; description: string; price: number }[] };

export class Pricing {
  private constructor(private readonly _price?: ItemPrice, private readonly _variants?: Variants) {}

  static from(input: PricingInput): Pricing {
    const hasPrice = input.price !== undefined;
    const hasVariants = input.variants !== undefined;
    if (hasPrice === hasVariants) {
      throw new InvalidDishPricingError(hasPrice
        ? 'A dish cannot have both a price and variants'
        : 'A dish must have either a price or variants');
    }
    return hasVariants
      ? new Pricing(undefined, Variants.fromInputs(input.variants!))
      : new Pricing(new ItemPrice(input.price!), undefined);
  }

  value(): { price: number } | { variants: { name: string; description: string; price: number }[] } {
    return this._variants ? { variants: this._variants.value() } : { price: this._price!.value() };
  }
}
