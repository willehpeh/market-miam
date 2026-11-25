import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';
import { Clock } from '@market-miam/common';
import { StripeSigning } from './stripe-signing';

export const STRIPE_ACCOUNTS_SIGNING_SECRET = 'whsec_test_accounts';
export const STRIPE_PAYMENTS_SIGNING_SECRET = 'whsec_test_payments';

export class StripeEvents {
  constructor(
    private readonly app: INestApplication,
    private readonly signedWith?: string,
  ) {}

  accountUpdated(noticeId: string, accountId: string): Test {
    return this.deliver('/webhooks/stripe/accounts', STRIPE_ACCOUNTS_SIGNING_SECRET, {
      id: noticeId,
      object: 'v2.core.event',
      type: 'v2.core.account.updated',
      livemode: false,
      created: this.now(),
      related_object: { id: accountId, type: 'v2.core.account', url: `/v2/core/accounts/${accountId}` },
    });
  }

  checkoutCompleted(eventId: string, checkoutId: string, accountId: string, changes: object = {}): Test {
    return this.deliver('/webhooks/stripe/payments', STRIPE_PAYMENTS_SIGNING_SECRET, {
      id: eventId,
      object: 'v2.core.event',
      type: 'v1.checkout.session.completed',
      livemode: false,
      created: this.now(),
      context: accountId,
      related_object: { id: checkoutId, type: 'checkout.session', url: `/v1/checkout/sessions/${checkoutId}` },
      ...changes,
    });
  }

  private deliver(path: string, destinationSecret: string, event: object): Test {
    const body = JSON.stringify(event, null, 2);
    return request(this.app.getHttpServer())
      .post(path)
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', new StripeSigning(this.signedWith ?? destinationSecret, this.now()).header(body))
      .send(body);
  }

  private now(): string {
    return this.app.get(Clock).now().value();
  }
}
