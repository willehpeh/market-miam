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

  it('makes a demo storefront reachable by its subdomain, as coming-soon until it is published', async () => {
    await seedDev(app);

    const res = await request(app.getHttpServer()).get('/public/storefront/demo').expect(200);
    expect(res.body).toEqual({ status: 'coming-soon', name: 'Chez Demo' });
  });
});
