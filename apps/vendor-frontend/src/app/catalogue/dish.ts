import { CatalogueItemView } from './catalogue';
import { Pricing } from './pricing';

// One dish on the vendor's carte.
export class Dish {
  private readonly _pricing: Pricing;

  constructor(private readonly view: CatalogueItemView) {
    this._pricing = Pricing.of(view);
  }

  itemId(): string {
    return this.view.itemId;
  }

  hasId(itemId: string): boolean {
    return this.view.itemId === itemId;
  }

  name(): string {
    return this.view.name;
  }

  description(): string {
    return this.view.description;
  }

  // Empty for a dish with no photo yet.
  imageReference(): string {
    return this.view.imageReference;
  }

  pricing(): Pricing {
    return this._pricing;
  }

  // Codes of the 14, or null for a dish added before allergens existed: undeclared, not "none".
  allergens(): string[] | null {
    return this.view.allergens;
  }

  allergensDeclared(): boolean {
    return this.view.allergens !== null;
  }
}
