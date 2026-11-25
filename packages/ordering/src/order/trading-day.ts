import { Availability } from './availability';
import { OrderLine } from './held-order';

export interface TradingDay {
  availabilityOf(lines: OrderLine[]): Availability;
}
