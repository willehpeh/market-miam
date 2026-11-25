import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { Merchants } from '../merchant';
import { OrderId, Orders } from '../order';
import { Payments } from '../payments';
import { TradingDays } from '../trading-days';
import { PlaceOrder } from './place-order';

@CommandHandler(PlaceOrder)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrder> {
  constructor(
    private readonly payments: Payments,
    private readonly orders: Orders,
    private readonly tradingDays: TradingDays,
    private readonly merchants: Merchants,
  ) {}

  async execute(request: PlaceOrder): Promise<void> {
    const page = await this.payments.completedPage(request.sessionId, request.accountId);
    const vendorId = new VendorId(page.vendorId);
    const held = page.order;
    const [order, day, merchant] = await Promise.all([
      this.orders.forId(new OrderId(held.orderId)),
      this.tradingDays.forVendorAtMarketOn(vendorId, held.marketId, held.date),
      this.merchants.forVendor(vendorId),
    ]);
    if (!merchant.isPaidThrough(request.accountId)) {
      return;
    }
    order.place(vendorId, held, day, new Instant(request.receivedAt));
    await this.orders.save(order, vendorId);
  }
}
