import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from './testing/api-test-app';
import { seedDev } from './dev-seed';

describe('seedDev', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('makes a published demo storefront with dishes reachable by its subdomain', async () => {
    await seedDev(app);

    const res = await request(app.getHttpServer()).get('/public/storefront/demo').expect(200);
    expect(res.body.status).toBe('published');
    expect(res.body.name).toBe('Chez Demo');
    expect(res.body.dishes.map((dish: { name: string }) => dish.name)).toEqual([
      'Bœuf bourguignon',
      'Tarte tatin',
      'Soupe du jour',
    ]);
  });
});
