import { OrderPlaced, OrderRefused } from '@market-miam/ordering';
import { TestCompletedPage, TestPlaceOrder } from './place-order/test-data';

const page = TestCompletedPage.valid();
const { receivedAt } = TestPlaceOrder.valid();
const heldFacts = { vendorId: page.vendorId, ...page.order };

export const orderStream = (id = page.order.orderId): string => `ordering-order-${id}`;

export const orderPlaced = (overrides: Partial<OrderPlaced['payload']> = {}): OrderPlaced => ({
  type: 'OrderPlaced',
  payload: { ...heldFacts, placedAt: receivedAt, ...overrides },
  version: 1,
});

export const orderRefused = (overrides: Partial<OrderRefused['payload']> = {}): OrderRefused => ({
  type: 'OrderRefused',
  payload: { ...heldFacts, reason: 'sold-out', refusedAt: receivedAt, ...overrides },
  version: 1,
});
