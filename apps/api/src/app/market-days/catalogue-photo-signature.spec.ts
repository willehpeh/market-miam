import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp } from '../testing/api-test-app';

describe('Signing a dish photo upload over HTTP', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a signed upload scoped to the vendor and the client-supplied itemId', async () => {
    const response = await request(app.getHttpServer())
      .post('/catalogue/photo/signature')
      .set('Authorization', 'Bearer any-token')
      .send({ itemId: 'coq-au-vin' })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        signature: 'signed(vendors/acme-bakery/dishes/coq-au-vin)',
        params: expect.objectContaining({ public_id: 'vendors/acme-bakery/dishes/coq-au-vin' }),
      }),
    );
  });
});
