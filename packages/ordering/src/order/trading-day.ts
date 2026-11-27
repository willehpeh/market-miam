import { Availability } from './availability';
import { BasketLine } from './basket-line';
import { OrderLine } from './held-order';

export interface TradingDay {
  availabilityOf(lines: BasketLine[]): Availability;
  quote(basket: BasketLine[]): OrderLine[];
}
