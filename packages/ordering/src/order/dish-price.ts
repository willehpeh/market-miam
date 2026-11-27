import { BasketLine } from './basket-line';

export interface DishPrice {
  of(line: BasketLine): number;
}

export class OnePrice implements DishPrice {
  constructor(private readonly unitPrice: number) {}

  of(): number {
    return this.unitPrice;
  }
}

export class PriceByVariant implements DishPrice {
  constructor(private readonly unitPrices: Record<string, number>) {}

  of({ variant }: BasketLine): number {
    return this.unitPrices[variant ?? ''];
  }
}
