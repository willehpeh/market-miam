import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { OrderId, Orders } from '../order';
import { PlaceOrder } from './place-order';

@CommandHandler(PlaceOrder)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrder> {
  constructor(private readonly orders: Orders) {}

  async execute(request: PlaceOrder): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const order = await this.orders.forId(new OrderId(request.order.orderId));
    order.place(vendorId, request.order, new Instant(request.placedAt));
    await this.orders.save(order, vendorId);
  }
}
