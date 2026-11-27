import { Availability } from './availability';
import { BasketRefusedError } from './basket-refused.error';
import { Quote } from './quote';
import { TradingDay } from './trading-day';

export class NoTradingDay implements TradingDay {
  availabilityOf(): Availability {
    return 'closed';
  }

  quote(): Quote {
    throw new BasketRefusedError('closed');
  }
}
