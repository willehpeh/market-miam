import { Availability } from './availability';
import { OrderLine } from './held-order';

export abstract class TradingDay {
  abstract availabilityOf(lines: OrderLine[]): Availability;
}
