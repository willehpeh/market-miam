import { OrderPlaced, OrderRefused } from '@market-miam/ordering';
import { TestPlaceOrder } from './place-order/test-data';

const placement = TestPlaceOrder.valid();

export const orderStream = (orderId = placement.order.orderId): string => `ordering-order-${orderId}`;

export const orderPlaced = (overrides: Partial<OrderPlaced['payload']> = {}): OrderPlaced => ({
  type: 'OrderPlaced',
  payload: { vendorId: placement.vendorId, ...placement.order, placedAt: placement.placedAt, ...overrides },
  version: 1,
});

export const orderRefused = (overrides: Partial<OrderRefused['payload']> = {}): OrderRefused => ({
  type: 'OrderRefused',
  payload: { vendorId: placement.vendorId, ...placement.order, reason: 'sold-out', refusedAt: placement.placedAt, ...overrides },
  version: 1,
});
