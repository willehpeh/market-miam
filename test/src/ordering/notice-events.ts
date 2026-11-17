import { PaymentAccountUpdateDetected } from '@market-miam/ordering';

export const noticeStream = (noticeId = 'evt_test_1'): string => `ordering-payment-account-notice-${noticeId}`;

export const updateDetected = (
  overrides: Partial<PaymentAccountUpdateDetected['payload']> = {},
): PaymentAccountUpdateDetected => ({
  type: 'PaymentAccountUpdateDetected',
  payload: { noticeId: 'evt_test_1', accountId: 'acct_test_1', ...overrides },
  version: 1,
});
