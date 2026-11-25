import { OrderPlaced, OrderRefused } from '@market-miam/ordering';
import { TestCompletedCheckout, TestPlaceOrder } from './place-order/test-data';

const checkout = TestCompletedCheckout.valid();
const { receivedAt } = TestPlaceOrder.valid();
const order = { vendorId: checkout.vendorId, ...checkout.order };

export const orderStream = (id = checkout.order.orderId): string => `ordering-order-${id}`;

export const orderPlaced = (overrides: Partial<OrderPlaced['payload']> = {}): OrderPlaced => ({
  type: 'OrderPlaced',
  payload: { ...order, placedAt: receivedAt, ...overrides },
  version: 1,
});

export const orderRefused = (overrides: Partial<OrderRefused['payload']> = {}): OrderRefused => ({
  type: 'OrderRefused',
  payload: { ...order, reason: 'sold-out', refusedAt: receivedAt, ...overrides },
  version: 1,
});
