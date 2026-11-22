import { PlaceOrder } from '@market-miam/ordering';

const PLACED_AT = '2026-11-21T11:42:00.000Z';

export class TestPlaceOrder {
  static valid(): PlaceOrder {
    return new PlaceOrder(
      'vendor-id',
      {
        orderId: 'order-id',
        marketId: 'market-id',
        date: '2026-11-21',
        lines: [{ dishId: 'dish-id', quantity: 2, unitPrice: 1250 }],
        paymentIntentId: 'pi_test_1',
      },
      PLACED_AT,
    );
  }
}
