import { Aggregate } from '@market-miam/event-sourcing';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { OrderEvent, OrderPlaced, OrderRefused } from './events';
import { RefusalReason } from './refusal-reason';
import { HeldOrder } from './held-order';
import { OrderId } from './order-id';

export class Order extends Aggregate {
  private _placed = false;

  constructor(private readonly _id: OrderId) {
    super();
  }

  place(vendorId: VendorId, held: HeldOrder, placedAt: Instant) {
    if (this._placed) {
      return;
    }
    this.raise(this.orderPlaced(vendorId, held, placedAt));
  }

  refuse(vendorId: VendorId, held: HeldOrder, reason: RefusalReason, refusedAt: Instant) {
    if (this._placed) {
      return;
    }
    this.raise(this.orderRefused(vendorId, held, reason, refusedAt));
  }

  streamId(): string {
    return this._id.streamId();
  }

  apply(event: OrderEvent): void {
    switch (event.type) {
      case 'OrderPlaced':
      case 'OrderRefused':
        this._placed = true;
        break;
    }
  }

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

  private orderRefused(vendorId: VendorId, held: HeldOrder, reason: RefusalReason, refusedAt: Instant): OrderRefused {
    return {
      type: 'OrderRefused',
      payload: {
        vendorId: vendorId.value(),
        orderId: held.orderId,
        marketId: held.marketId,
        date: held.date,
        lines: held.lines,
        paymentIntentId: held.paymentIntentId,
        reason,
        refusedAt: refusedAt.value(),
      },
      version: 1,
    };
  }
}
