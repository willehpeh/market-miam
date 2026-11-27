import { randomUUID } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Clock } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { Merchants } from '../merchant';
import { Payments } from '../payments';
import { TradingDays } from '../trading-days';
import { StartCheckout } from './start-checkout';

const CHECKOUT_LIFETIME_IN_MS = 30 * 60 * 1000;

@CommandHandler(StartCheckout)
export class StartCheckoutHandler implements ICommandHandler<StartCheckout> {
  constructor(
    private readonly payments: Payments,
    private readonly tradingDays: TradingDays,
    private readonly merchants: Merchants,
    private readonly clock: Clock,
  ) {}

  async execute({ vendorId, marketId, basket }: StartCheckout): Promise<string> {
    const vendor = new VendorId(vendorId);
    const date = this.clock.today().value();
    const [day, merchant] = await Promise.all([
      this.tradingDays.forVendorAtMarketOn(vendor, marketId, date),
      this.merchants.forVendor(vendor),
    ]);
    return this.payments.startCheckout({
      accountId: merchant.paymentAccountId(),
      orderId: randomUUID(),
      vendorId,
      marketId,
      date,
      lines: day.price(basket),
      expiresAt: new Date(Date.parse(this.clock.now().value()) + CHECKOUT_LIFETIME_IN_MS).toISOString(),
    });
  }
}
