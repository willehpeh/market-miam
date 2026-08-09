import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const schedule = {
  scheduleId: 'schedule-1',
  startDate: '2026-07-15',
  market: {
    id: 'market-1',
    name: 'Marché de Belleville',
    streetAddress: 'Boulevard de Belleville',
    codePostal: '75011',
    town: 'Paris',
    pitch: 'B12',
  },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
};

describe('Reading a vendor\'s upcoming market days', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  it('expands the schedule into fully described days', async () => {
    await request(app.getHttpServer())
      .post('/market-schedules')
      .set('Authorization', 'Bearer any-token')
      .send(schedule)
      .expect(201);
    await app.get(Subscriptions).drain();

    const response = await request(app.getHttpServer())
      .get('/market-days/upcoming')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body.marketDays.map((day: { date: string }) => day.date)).toEqual([
      '2026-07-21', '2026-07-28', '2026-08-04', '2026-08-11', '2026-08-18',
    ]);
    expect(response.body.marketDays[0]).toEqual({
      scheduleId: 'schedule-1',
      marketId: 'market-1',
      date: '2026-07-21',
      day: 'TUE',
      startTime: '07:00',
      endTime: '14:30',
      absent: false,
      dishes: [],
      market: { name: 'Marché de Belleville', town: 'Paris', codePostal: '75011', streetAddress: 'Boulevard de Belleville', pitch: 'B12' },
    });
  });
});
