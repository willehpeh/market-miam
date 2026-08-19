import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

// fixedClock is 2026-06-23T09:00Z — a Tuesday, 11:00 in Paris.
const LAST_TUESDAY = '2026-06-16';

const schedule = {
  scheduleId: 'schedule-1',
  startDate: '2026-06-09',
  market: { id: 'market-1', name: 'Marché de Belleville', codePostal: '75011', town: 'Paris' },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

describe('The clock phase of a market day', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const authed = (method: 'post' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  const seed = async (days = schedule.days) => {
    await authed('post', '/market-schedules').send({ ...schedule, days }).expect(201);
    await app.get(Subscriptions).drain();
  };

  // The point lookup has no window (decision 50), so it is the handler that meets days the
  // list filters away — and it read every one of them as in progress before decision 56.
  it('says past for a day whose date has gone', async () => {
    await seed();

    const response = await authed('get', `/market-days/market-1/${LAST_TUESDAY}`).expect(200);

    expect(response.body.phase).toBe('past');
  });
});
