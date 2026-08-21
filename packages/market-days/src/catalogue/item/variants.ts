import { Variant } from './variant';
import { TooFewVariantsError } from '../errors/too-few-variants.error';
import { DuplicateVariantNameError } from '../errors/duplicate-variant-name.error';
import { MismatchedPricingError } from '../errors/mismatched-pricing.error';

export class Variants {
  private readonly _variants: Variant[];

  constructor(variants: Variant[]) {
    if (variants.length < 2) {
      throw new TooFewVariantsError(`An item with variants needs at least two; got ${ variants.length }`);
    }
    const names = variants.map(variant => variant.value().name);
    if (new Set(names).size !== names.length) {
      throw new DuplicateVariantNameError('Variant names must be unique within an item');
    }
    this._variants = variants;
  }

  static fromInputs(inputs: { name: string; description: string; price: number }[]): Variants {
    return new Variants(inputs.map(input => new Variant(input.name, input.description, input.price)));
  }

  confirmNamed(names: string[]): void {
    const known = this._variants.map(variant => variant.value().name);
    const unknown = names.filter(name => !known.includes(name));
    if (unknown.length > 0) {
      throw new MismatchedPricingError(`This dish has no variant named ${ unknown.join(', ') }`);
    }
  }

  value(): { name: string; description: string; price: number }[] {
    return this._variants.map(variant => variant.value());
  }
}
