import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { OrderPlaced } from './events';
import { HeldOrder } from './held-order';
import { OrderId } from './order-id';

export class Order extends Aggregate {
  constructor(private readonly _id: OrderId) {
    super();
  }

  place(vendorId: VendorId, held: HeldOrder, placedAt: Instant) {
    this.raise(this.orderPlaced(vendorId, held, placedAt));
  }

  streamId(): string {
    return this._id.streamId();
  }

  override apply(): void {}

  private orderPlaced(vendorId: VendorId, held: HeldOrder, placedAt: Instant): OrderPlaced {
    return {
      type: 'OrderPlaced',
      payload: {
        vendorId: vendorId.value(),
        orderId: held.orderId,
        marketId: held.marketId,
        date: held.date,
        lines: held.lines,
        paymentIntentId: held.paymentIntentId,
        placedAt: placedAt.value(),
      },
      version: 1,
    };
  }
}
