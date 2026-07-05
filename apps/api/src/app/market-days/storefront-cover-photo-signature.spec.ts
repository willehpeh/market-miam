import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';

describe('Signing a cover photo upload over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a signed upload scoped to the authenticated vendor', async () => {
    const response = await request(app.getHttpServer())
      .post('/storefront/cover-photo/signature')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        signature: 'signed(storefronts/acme-bakery/cover-photo)',
        params: expect.objectContaining({ public_id: 'storefronts/acme-bakery/cover-photo' }),
      }),
    );
  });
});
