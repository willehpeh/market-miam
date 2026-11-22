import { VendorId, VendorScopedEvents } from '@market-miam/shared-kernel';
import { Order } from './order';
import { OrderId } from './order-id';

export class Orders {
  constructor(private readonly vendorEvents: VendorScopedEvents) {}

  async forId(id: OrderId): Promise<Order> {
    return new Order(id).rehydrate(await this.vendorEvents.load(id.streamId()));
  }

  save(order: Order, vendorId: VendorId): Promise<void> {
    return this.vendorEvents.save(order.streamId(), order, vendorId);
  }
}
