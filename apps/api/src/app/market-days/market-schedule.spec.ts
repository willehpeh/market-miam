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

describe('Managing market schedules over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
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

  function list() {
    return request(app.getHttpServer())
      .get('/market-schedules')
      .set('Authorization', 'Bearer any-token');
  }

  function cancel(scheduleId: string) {
    return request(app.getHttpServer())
      .delete(`/market-schedules/${scheduleId}`)
      .set('Authorization', 'Bearer any-token');
  }

  function declareAbsence(scheduleId: string, body: object) {
    return request(app.getHttpServer())
      .post(`/market-schedules/${scheduleId}/absences`)
      .set('Authorization', 'Bearer any-token')
      .send(body);
  }

  function upcoming() {
    return request(app.getHttpServer())
      .get('/market-schedules/upcoming')
      .set('Authorization', 'Bearer any-token');
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

  it('lists a registered schedule back for the authenticated vendor', async () => {
    await post(schedule).expect(201);
    await app.get(Subscriptions).drain();

    const response = await list().expect(200);

    expect(response.body).toEqual({ schedules: [schedule] });
  });

  it('returns no schedules for a vendor with none', async () => {
    const response = await list().expect(200);

    expect(response.body).toEqual({ schedules: [] });
  });

  it('cancels a registered schedule for the authenticated vendor', async () => {
    await post(schedule).expect(201);

    await cancel(schedule.scheduleId).expect(200);
  });

  it('rejects cancelling an unknown schedule as a bad request', async () => {
    await cancel('never-registered').expect(400);
  });

  it('declares an absence range for a registered schedule', async () => {
    await post(schedule).expect(201);

    await declareAbsence(schedule.scheduleId, { from: '2026-07-21', to: '2026-07-28' }).expect(201);
  });

  it('rejects an absence range whose end is before its start as a bad request', async () => {
    await post(schedule).expect(201);

    await declareAbsence(schedule.scheduleId, { from: '2026-07-28', to: '2026-07-21' }).expect(400);
  });

  it('lists the upcoming market days for the authenticated vendor', async () => {
    await post(schedule).expect(201);
    await app.get(Subscriptions).drain();

    const response = await upcoming().expect(200);

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
      market: { name: 'Marché de Belleville', town: 'Paris', codePostal: '75011', streetAddress: 'Boulevard de Belleville', pitch: 'B12' },
    });
  });

  it('marks an occurrence absent after an absence is declared over it', async () => {
    await post(schedule).expect(201);
    await declareAbsence(schedule.scheduleId, { from: '2026-07-27', to: '2026-07-29' }).expect(201);
    await app.get(Subscriptions).drain();

    const response = await upcoming().expect(200);

    const absent = response.body.marketDays.filter((day: { absent: boolean }) => day.absent);
    expect(absent.map((day: { date: string }) => day.date)).toEqual(['2026-07-28']);
  });
});
