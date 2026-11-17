import { DetectPaymentAccountUpdate } from '@market-miam/ordering';

export class TestDetectPaymentAccountUpdate {
  static valid(): DetectPaymentAccountUpdate {
    return new DetectPaymentAccountUpdate('evt_test_1', 'acct_test_1');
  }
}
