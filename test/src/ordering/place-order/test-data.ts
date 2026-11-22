import { HeldOrder, PlaceOrder } from '@market-miam/ordering';
import { TestDetectPaymentAccountUpdate } from '../detect-payment-account-update/test-data';

const RECEIVED_AT = '2026-11-21T11:42:00.000Z';

export class TestPlaceOrder {
  static valid(): PlaceOrder {
    return new PlaceOrder(
      'vendor-id',
      {
        orderId: 'order-id',
        accountId: TestDetectPaymentAccountUpdate.valid().accountId,
        marketId: 'market-id',
        date: '2026-11-21',
        lines: [
          { dishId: 'dish-id', quantity: 2, unitPrice: 1250 },
          { dishId: 'another-dish-id', variant: 'Small', quantity: 1, unitPrice: 900 },
        ],
        paymentIntentId: 'pi_test_1',
      },
      RECEIVED_AT,
    );
  }

  static withOrder(overrides: Partial<HeldOrder>): PlaceOrder {
    const defaults = this.valid();
    return new PlaceOrder(defaults.vendorId, { ...defaults.order, ...overrides }, defaults.receivedAt);
  }
}
