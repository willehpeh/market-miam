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

  it('makes a demo storefront reachable by its subdomain', async () => {
    await seedDev(app);

    const res = await request(app.getHttpServer()).get('/public/storefront/demo').expect(200);
    expect(res.body).toEqual({
      name: 'Chez Demo',
      description: 'Cuisine de démonstration maison',
      phone: '0102030405',
      coverPhoto: 'v1784235195/demo-cover_ghvwt5',
    });
  });
});
