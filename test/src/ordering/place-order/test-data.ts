import { CompletedPage, PlaceOrder } from '@market-miam/ordering';
import { TestDetectPaymentAccountUpdate } from '../detect-payment-account-update/test-data';

const RECEIVED_AT = '2026-11-21T11:42:00.000Z';

export class TestPlaceOrder {
  static valid(): PlaceOrder {
    return new PlaceOrder('cs_test_1', TestDetectPaymentAccountUpdate.valid().accountId, RECEIVED_AT);
  }

  static with(overrides: Partial<PlaceOrder>): PlaceOrder {
    const defaults = this.valid();
    return new PlaceOrder(
      overrides.sessionId ?? defaults.sessionId,
      overrides.accountId ?? defaults.accountId,
      overrides.receivedAt ?? defaults.receivedAt,
    );
  }
}

export class TestCompletedPage {
  static valid(): CompletedPage {
    return {
      vendorId: 'vendor-id',
      order: {
        orderId: 'order-id',
        marketId: 'market-id',
        date: '2026-11-21',
        lines: [
          { dishId: 'dish-id', quantity: 2, unitPrice: 1250 },
          { dishId: 'another-dish-id', variant: 'Small', quantity: 1, unitPrice: 900 },
        ],
        paymentIntentId: 'pi_test_1',
      },
    };
  }
}
