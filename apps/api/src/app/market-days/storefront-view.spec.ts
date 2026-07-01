import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';
import { ConsumerRunner } from '../event-sourcing/consumer-runner';

describe('Viewing a storefront over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the projected storefront view for the authenticated vendor', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    await app.get(ConsumerRunner).drain();

    const response = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);

    expect(response.body).toEqual({
      name: '',
      description: '',
      imageReference: '',
    });
  });

  it('returns 404 while the storefront has not yet been projected', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(404);
  });
});
