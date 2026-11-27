import { BasketLine } from './basket-line';

export interface DishPricing {
  unitPriceFor(line: BasketLine): number;
}

export class FlatPricing implements DishPricing {
  constructor(private readonly unitPrice: number) {}

  unitPriceFor(): number {
    return this.unitPrice;
  }
}

export class VariantPricing implements DishPricing {
  constructor(private readonly unitPrices: Record<string, number>) {}

  unitPriceFor({ variant }: BasketLine): number {
    return this.unitPrices[variant ?? ''];
  }
}
