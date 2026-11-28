import { Availability } from './availability';
import { BasketLine } from './basket-line';
import { Basket } from './basket';
import { Quote } from './quote';

export interface TradingDay {
  availabilityOf(lines: BasketLine[]): Availability;
  quote(basket: Basket): Quote;
}
