import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { OrderId, Orders } from '../order';
import { TradingDays } from '../trading-days';
import { PlaceOrder } from './place-order';

@CommandHandler(PlaceOrder)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrder> {
  constructor(
    private readonly orders: Orders,
    private readonly tradingDays: TradingDays,
  ) {}

  async execute(request: PlaceOrder): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const held = request.order;
    const [order, day] = await Promise.all([
      this.orders.forId(new OrderId(held.orderId)),
      this.tradingDays.forVendorAtMarketOn(vendorId, held.marketId, held.date),
    ]);
    order.place(vendorId, held, day, new Instant(request.placedAt));
    await this.orders.save(order, vendorId);
  }
}
