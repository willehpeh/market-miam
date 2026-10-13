import { UnknownAllergenError } from '../errors/unknown-allergen.error';

// Annex II of INCO 1169/2011, in the regulation's own order. Codes, not labels: the
// French wording is the frontends' to word.
const ANNEX_II = [
  'gluten', 'crustaceans', 'eggs', 'fish', 'peanuts', 'soybeans', 'milk',
  'nuts', 'celery', 'mustard', 'sesame', 'sulphites', 'lupin', 'molluscs',
];

// What a dish contains, of the 14. Empty is a declaration in its own right: none of them.
export class Allergens {
  private readonly _allergens: string[];

  constructor(allergens: string[]) {
    const unknown = allergens.find((allergen) => !ANNEX_II.includes(allergen));
    if (unknown !== undefined) {
      throw new UnknownAllergenError(unknown);
    }
    this._allergens = ANNEX_II.filter((allergen) => allergens.includes(allergen));
  }

  value(): string[] {
    return [...this._allergens];
  }

  equals(other: Allergens): boolean {
    return this._allergens.join() === other._allergens.join();
  }
}
