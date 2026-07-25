import { Variant } from './variant';
import { TooFewVariantsError } from '../errors/too-few-variants.error';
import { DuplicateVariantNameError } from '../errors/duplicate-variant-name.error';

export class Variants {
  private readonly _variants: Variant[];

  constructor(variants: Variant[]) {
    if (variants.length < 2) {
      throw new TooFewVariantsError(`A dish with variants needs at least two; got ${ variants.length }`);
    }
    const names = variants.map(variant => variant.value().name);
    if (new Set(names).size !== names.length) {
      throw new DuplicateVariantNameError('Variant names must be unique within a dish');
    }
    this._variants = variants;
  }

  value(): { name: string; description: string; price: number }[] {
    return this._variants.map(variant => variant.value());
  }
}
