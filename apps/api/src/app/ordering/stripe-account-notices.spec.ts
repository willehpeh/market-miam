import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';
import { bootApiTestApp, FIXED_NOW, fixedClock } from '../testing/api-test-app';
import { EventLog } from '../testing/event-log';

const SIGNING_SECRET = 'whsec_test_accounts';

describe("Stripe's account notices over HTTP", () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock, stripeAccountsSigningSecret: SIGNING_SECRET });
  });

  afterEach(async () => {
    await app.close();
  });

  it('records that the account Stripe names was updated', async () => {
    await notify(accountUpdated('evt_test_1', 'acct_test_1')).expect(200);

    expect(await new EventLog(app).ofType('PaymentAccountUpdateDetected')).toEqual([
      expect.objectContaining({ payload: { noticeId: 'evt_test_1', accountId: 'acct_test_1' } }),
    ]);
  });

  function notify(notice: object): Test {
    const body = JSON.stringify(notice);
    return request(app.getHttpServer())
      .post('/webhooks/stripe/accounts')
      .set('Content-Type', 'application/json')
      .set('Stripe-Signature', signatureFor(body))
      .send(body);
  }
});

function accountUpdated(noticeId: string, accountId: string): object {
  return {
    id: noticeId,
    object: 'v2.core.event',
    type: 'v2.core.account.updated',
    livemode: false,
    created: FIXED_NOW,
    related_object: { id: accountId, type: 'v2.core.account', url: `/v2/core/accounts/${accountId}` },
  };
}

function signatureFor(body: string): string {
  const timestamp = Math.floor(new Date(FIXED_NOW).getTime() / 1000);
  const signature = createHmac('sha256', SIGNING_SECRET).update(`${timestamp}.${body}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
