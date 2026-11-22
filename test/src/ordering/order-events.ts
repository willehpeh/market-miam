import { OrderPlaced } from '@market-miam/ordering';
import { TestPlaceOrder } from './place-order/test-data';

const placement = TestPlaceOrder.valid();

export const orderStream = (orderId = placement.order.orderId): string => `ordering-order-${orderId}`;

export const orderPlaced = (overrides: Partial<OrderPlaced['payload']> = {}): OrderPlaced => ({
  type: 'OrderPlaced',
  payload: { vendorId: placement.vendorId, ...placement.order, placedAt: placement.placedAt, ...overrides },
  version: 1,
});
