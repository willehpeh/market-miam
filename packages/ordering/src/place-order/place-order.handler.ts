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
    const order = await this.orders.forId(new OrderId(request.order.orderId));
    const refusal = await this.tradingDays.refusalOf(vendorId, request.order);
    if (refusal) {
      order.refuse(vendorId, request.order, refusal, new Instant(request.placedAt));
    } else {
      order.place(vendorId, request.order, new Instant(request.placedAt));
    }
    await this.orders.save(order, vendorId);
  }
}
