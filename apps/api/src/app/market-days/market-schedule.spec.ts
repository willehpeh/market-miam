import { afterEach, beforeEach, describe, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';

const schedule = {
  scheduleId: 'schedule-1',
  scheduleName: 'Marché de Belleville',
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

describe('Registering a market schedule over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  function post(body: object) {
    return request(app.getHttpServer())
      .post('/market-schedules')
      .set('Authorization', 'Bearer any-token')
      .send(body);
  }

  it('registers a market schedule for the authenticated vendor', async () => {
    await post(schedule).expect(201);
  });

  it('rejects a market with an empty name as a bad request', async () => {
    await post({ ...schedule, market: { ...schedule.market, name: '' } }).expect(400);
  });

  it('rejects a malformed code postal as a bad request', async () => {
    await post({ ...schedule, market: { ...schedule.market, codePostal: '750' } }).expect(400);
  });
});
