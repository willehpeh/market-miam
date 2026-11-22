import { OrderPlaced, OrderRefused } from '@market-miam/ordering';
import { TestPlaceOrder } from './place-order/test-data';

const placement = TestPlaceOrder.valid();
const { orderId, marketId, date, lines, paymentIntentId } = placement.order;
const heldFacts = { vendorId: placement.vendorId, orderId, marketId, date, lines, paymentIntentId };

export const orderStream = (id = orderId): string => `ordering-order-${id}`;

export const orderPlaced = (overrides: Partial<OrderPlaced['payload']> = {}): OrderPlaced => ({
  type: 'OrderPlaced',
  payload: { ...heldFacts, placedAt: placement.receivedAt, ...overrides },
  version: 1,
});

export const orderRefused = (overrides: Partial<OrderRefused['payload']> = {}): OrderRefused => ({
  type: 'OrderRefused',
  payload: { ...heldFacts, reason: 'sold-out', refusedAt: placement.receivedAt, ...overrides },
  version: 1,
});
