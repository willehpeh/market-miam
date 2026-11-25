import { Availability } from './availability';
import { TradingDay } from './trading-day';

export class UnscheduledDay implements TradingDay {
  availabilityOf(): Availability {
    return 'closed';
  }
}
