import { Availability } from './availability';
import { BasketRefusedError } from './basket-refused.error';
import { OrderLine } from './held-order';
import { TradingDay } from './trading-day';

export class NoTradingDay implements TradingDay {
  availabilityOf(): Availability {
    return 'closed';
  }

  quote(): OrderLine[] {
    throw new BasketRefusedError('closed');
  }
}
