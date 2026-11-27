import { Availability } from './availability';
import { BasketLine } from './basket-line';
import { Quote } from './quote';

export interface TradingDay {
  availabilityOf(lines: BasketLine[]): Availability;
  quote(basket: BasketLine[]): Quote;
}
