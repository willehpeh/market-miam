import { afterEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootAdminTestApp } from './testing/admin-test-app';

describe('Listing Auth0 users over HTTP', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
  });

  it('lists each account with its email, vendorId and subdomain, blank when absent', async () => {
    app = await bootAdminTestApp(
      [
        { email: 'a@x.com', vendorId: 'uuid-1' },
        { email: 'b@x.com' },
        { email: 'c@x.com', vendorId: 'uuid-3' },
      ],
      [['uuid-1', 'acme']],
    );

    const response = await request(app.getHttpServer()).get('/api/users').expect(200);

    expect(response.body).toEqual([
      { email: 'a@x.com', vendorId: 'uuid-1', subdomain: 'acme' },
      { email: 'b@x.com', vendorId: '', subdomain: '' },
      { email: 'c@x.com', vendorId: 'uuid-3', subdomain: '' },
    ]);
  });
});
