import { BasketLine } from './basket-line';
import { BasketRefusedError } from './basket-refused.error';
import { DishPricing } from './dish-pricing';

export interface DishOnMenu {
  isOnSale(): boolean;
  unitPriceFor(line: BasketLine): number;
}

export class DishOnSale implements DishOnMenu {
  constructor(private readonly pricing: DishPricing) {}

  isOnSale(): boolean {
    return true;
  }

  unitPriceFor(line: BasketLine): number {
    return this.pricing.unitPriceFor(line);
  }
}

export class SoldOutDish implements DishOnMenu {
  isOnSale(): boolean {
    return false;
  }

  unitPriceFor(): number {
    throw new BasketRefusedError('sold-out');
  }
}
