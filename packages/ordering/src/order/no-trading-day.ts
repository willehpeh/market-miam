import { Availability } from './availability';
import { TradingDay } from './trading-day';

export class NoTradingDay implements TradingDay {
  availabilityOf(): Availability {
    return 'closed';
  }
}
