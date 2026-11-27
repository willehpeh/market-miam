import { Availability } from './availability';
import { OrderLine } from './held-order';
import { TradingDay } from './trading-day';

export class NoTradingDay implements TradingDay {
  availabilityOf(): Availability {
    return 'closed';
  }

  price(): OrderLine[] {
    return [];
  }
}
