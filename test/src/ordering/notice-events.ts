import { PaymentAccountUpdateDetected } from '@market-miam/ordering';
import { TestDetectPaymentAccountUpdate } from './detect-payment-account-update/test-data';

const notice = TestDetectPaymentAccountUpdate.valid();

export const noticeStream = (noticeId = notice.noticeId): string => `ordering-payment-account-notice-${noticeId}`;

export const updateDetected = (
  overrides: Partial<PaymentAccountUpdateDetected['payload']> = {},
): PaymentAccountUpdateDetected => ({
  type: 'PaymentAccountUpdateDetected',
  payload: { noticeId: notice.noticeId, accountId: notice.accountId, ...overrides },
  version: 1,
});
