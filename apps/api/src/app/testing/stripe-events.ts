import { createHmac } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';
import { Clock } from '@market-miam/common';

export const STRIPE_ACCOUNTS_SIGNING_SECRET = 'whsec_test_accounts';

export class StripeEvents {
  constructor(
    private readonly app: INestApplication,
    private readonly secret: string = STRIPE_ACCOUNTS_SIGNING_SECRET,
  ) {}

  accountUpdated(noticeId: string, accountId: string): Test {
    return this.deliver('/webhooks/stripe/accounts', {
      id: noticeId,
      object: 'v2.core.event',
      type: 'v2.core.account.updated',
      livemode: false,
      created: this.app.get(Clock).now().value(),
      related_object: { id: accountId, type: 'v2.core.account', url: `/v2/core/accounts/${accountId}` },
    });
  }

  private deliver(path: string, event: object): Test {
    const body = JSON.stringify(event, null, 2);
    return request(this.app.getHttpServer())
      .post(path)
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', this.signatureFor(body))
      .send(body);
  }

  private signatureFor(body: string): string {
    const timestamp = Math.floor(new Date(this.app.get(Clock).now().value()).getTime() / 1000);
    const signature = createHmac('sha256', this.secret).update(`${timestamp}.${body}`).digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }
}
