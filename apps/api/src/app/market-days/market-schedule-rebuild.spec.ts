import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { MarketScheduleViews, MarketScheduleViewStore } from '@market-miam/market-days';
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

const { id: marketId, ...marketDisplay } = schedule.market;

const scheduleView = {
  scheduleId: schedule.scheduleId,
  marketId,
  market: marketDisplay,
  startDate: schedule.startDate,
  days: schedule.days,
  frequency: schedule.frequency,
};

describe('Rebuilding the market schedule projection', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  it('clears the read model and replays it from the event log', async () => {
    await request(app.getHttpServer())
      .post('/market-schedules')
      .set('Authorization', 'Bearer any-token')
      .send(schedule)
      .expect(201);
    await app.get(Subscriptions).drain();

    // An orphan row with no backing events — only a real clear removes it, since
    // replay never recreates it. This is what distinguishes clear+replay from a no-op.
    await app.get(MarketScheduleViewStore).recordSchedule(
      { ...scheduleView, scheduleId: 'ghost-schedule' },
      'ghost-vendor',
    );

    await app.get(Subscriptions).rebuild('market-schedule-view');

    const rebuilt = await request(app.getHttpServer())
      .get('/market-schedules')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(rebuilt.body).toEqual({ schedules: [scheduleView] });
    expect(await app.get(MarketScheduleViews).forVendor('ghost-vendor')).toEqual({ schedules: [] });
  });

  // recordAbsence appends, so it is the one write here that a replay could double.
  // It converges only because replaying MarketScheduleRegistered overwrites the whole
  // schedule first, dropping the absences the earlier pass appended.
  it('replays declared absences once rather than appending them again', async () => {
    await request(app.getHttpServer())
      .post('/market-schedules')
      .set('Authorization', 'Bearer any-token')
      .send(schedule)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/market-schedules/${schedule.scheduleId}/absences`)
      .set('Authorization', 'Bearer any-token')
      .send({ from: '2026-08-04', to: '2026-08-18' })
      .expect(201);
    await app.get(Subscriptions).drain();

    await app.get(Subscriptions).rebuild('market-schedule-view');

    const rebuilt = await request(app.getHttpServer())
      .get('/market-schedules')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(rebuilt.body.schedules[0].absences).toEqual([{ from: '2026-08-04', to: '2026-08-18' }]);
  });
});
