import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, fixedClock } from '../testing/api-test-app';

// The transport gate: a body that isn't the shape the handler reads earns a 400 naming
// the field, never a 500 from deep inside a value object. Shape only — a well-shaped
// body carrying a value the domain refuses is the DomainErrorFilter's 400, not this one.
describe('Request shape', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  });

  afterEach(async () => {
    await app.close();
  });

  const send = (method: 'post' | 'put', url: string, body: unknown) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token').send(body as object);

  const cases: [description: string, method: 'post' | 'put', url: string, body: unknown, field: string][] = [
    ['a menu without itemIds', 'put', '/market-days/market-1/2026-06-30/menu', {}, 'itemIds'],
    ['a menu whose itemIds is not an array', 'put', '/market-days/market-1/2026-06-30/menu', { itemIds: 'item-1' }, 'itemIds'],
    ['a menu holding a non-string id', 'put', '/market-days/market-1/2026-06-30/menu', { itemIds: [7] }, 'itemIds.0'],
    ['an item without a name', 'post', '/catalogue', { itemId: 'item-1', description: 'Mijoté' }, 'name'],
    ['an item whose variants is not an array', 'post', '/catalogue', { itemId: 'item-1', name: 'Bœuf', description: '', variants: 'grande' }, 'variants'],
    ['a variant without a price', 'post', '/catalogue', { itemId: 'item-1', name: 'Bœuf', description: '', variants: [{ name: 'Grande', description: '' }] }, 'variants.0.price'],
    ['a reorder without itemIds', 'put', '/catalogue/order', {}, 'itemIds'],
    ['a revision without a description', 'put', '/catalogue/item-1', { name: 'Bœuf' }, 'description'],
    ['a photo without its reference', 'put', '/catalogue/item-1/photo', {}, 'imageReference'],
    ['a photo signature without its item', 'post', '/catalogue/photo/signature', {}, 'itemId'],
    ['a schedule without its market', 'post', '/market-schedules', { scheduleId: 's1', startDate: '2026-07-01', days: [] }, 'market'],
    ['a schedule whose days is not an array', 'post', '/market-schedules', { scheduleId: 's1', startDate: '2026-07-01', market: marketBody(), days: 'TUE' }, 'days'],
    ['a schedule day without its weekday', 'post', '/market-schedules', { scheduleId: 's1', startDate: '2026-07-01', market: marketBody(), days: [{ startTime: '08:00' }] }, 'days.0.day'],
    ['an amendment without a start date', 'put', '/market-schedules/schedule-1', { market: marketBody(), days: [] }, 'startDate'],
    ['an absence without its range', 'post', '/market-schedules/schedule-1/absences', { from: '2026-07-01' }, 'to'],
    ['a storefront edit without a name', 'put', '/storefront', { description: 'Fresh bread' }, 'name'],
    ['a cover photo with a non-numeric version', 'put', '/storefront/cover-photo', { version: 'seven' }, 'version'],
  ];

  it.each(cases)('rejects %s as a 400 naming the field', async (_description, method, url, body, field) => {
    const response = await send(method, url, body).expect(400);

    expect(response.body.statusCode).toBe(400);
    expect(response.body.message).toContain(field);
  });

  it('tolerates unknown extra fields rather than rejecting them', async () => {
    await send('put', '/market-days/market-1/2026-06-30/menu', { itemIds: [], sentByAnOlderClient: true }).expect(200);
  });
});

function marketBody() {
  return { id: 'market-1', name: 'Marché de Belleville', codePostal: '75011', town: 'Paris' };
}
