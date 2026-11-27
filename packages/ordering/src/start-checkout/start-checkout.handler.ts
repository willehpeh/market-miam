import { randomUUID } from 'node:crypto';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Clock } from '@market-miam/common';
import { Merchants } from '../merchant';
import { Payments } from '../payments';
import { PublishedStorefronts, StorefrontNotPublishedError } from '../published-storefronts';
import { TradingDays } from '../trading-days';
import { StartCheckout } from './start-checkout';

const CHECKOUT_LIFETIME_IN_MINUTES = 30;

@CommandHandler(StartCheckout)
export class StartCheckoutHandler implements ICommandHandler<StartCheckout> {
  constructor(
    private readonly storefronts: PublishedStorefronts,
    private readonly payments: Payments,
    private readonly tradingDays: TradingDays,
    private readonly merchants: Merchants,
    private readonly clock: Clock,
  ) {}

  async execute({ subdomain, marketId, basket }: StartCheckout): Promise<string> {
    const vendor = await this.storefronts.vendorAt(subdomain);
    if (!vendor) {
      throw new StorefrontNotPublishedError();
    }
    const date = this.clock.today().value();
    const [day, merchant] = await Promise.all([
      this.tradingDays.forVendorAtMarketOn(vendor, marketId, date),
      this.merchants.forVendor(vendor),
    ]);
    const quote = day.quote(basket);
    return merchant.startCheckout(
      {
        orderId: randomUUID(),
        vendorId: vendor.value(),
        marketId,
        date,
        lines: quote.lines(),
        expiresAt: this.clock.now().plusMinutes(CHECKOUT_LIFETIME_IN_MINUTES).value(),
      },
      this.payments,
    );
  }
}
