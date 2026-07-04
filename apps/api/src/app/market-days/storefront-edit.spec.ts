import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, openStorefrontFor } from '../testing/api-test-app';

describe('Editing a storefront over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects an empty name as a bad request, not a server error', async () => {
    await openStorefrontFor(app, 'acme-bakery');

    const response = await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: '', description: 'Fresh bread daily', phone: '' })
      .expect(400);

    expect(response.body.message).toContain('name');
  });
});
