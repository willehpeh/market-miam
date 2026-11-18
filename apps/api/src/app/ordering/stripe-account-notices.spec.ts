import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { EventLog } from '../testing/event-log';
import { StripeEvents } from '../testing/stripe-events';

describe("Stripe's account notices over HTTP", () => {
  let app: INestApplication;
  let stripe: StripeEvents;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
    stripe = new StripeEvents(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('records the update a genuine account notice reports', async () => {
    await stripe.accountUpdated('evt_test_1', 'acct_test_1').expect(200);

    expect(await new EventLog(app).ofType('PaymentAccountUpdateDetected')).toEqual([
      expect.objectContaining({ payload: { noticeId: 'evt_test_1', accountId: 'acct_test_1' } }),
    ]);
  });

  it('refuses a notice signed with another secret, recording nothing', async () => {
    const impostor = new StripeEvents(app, 'whsec_test_someone_else');

    await impostor.accountUpdated('evt_test_1', 'acct_test_1').expect(400);

    expect(await new EventLog(app).ofType('PaymentAccountUpdateDetected')).toEqual([]);
  });
});
