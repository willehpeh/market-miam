import { BasketLine } from './basket-line';
import { BasketRefusedError } from './basket-refused.error';

export interface DishPricing {
  unitPriceFor(line: BasketLine): number;
}

export class FlatPricing implements DishPricing {
  constructor(private readonly unitPrice: number) {}

  unitPriceFor({ variant }: BasketLine): number {
    if (variant !== undefined) {
      throw new BasketRefusedError('sold-out');
    }
    return this.unitPrice;
  }
}

export class VariantPricing implements DishPricing {
  private readonly unitPrices: Map<string, number>;

  constructor(unitPrices: Record<string, number>) {
    this.unitPrices = new Map(Object.entries(unitPrices));
  }

  unitPriceFor({ variant }: BasketLine): number {
    const unitPrice = variant === undefined ? undefined : this.unitPrices.get(variant);
    if (unitPrice === undefined) {
      throw new BasketRefusedError('sold-out');
    }
    return unitPrice;
  }
}
