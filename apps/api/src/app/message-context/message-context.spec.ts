import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-miam/event-sourcing';
import { bootApiTestApp } from '../testing/api-test-app';

describe('Message context through the request pipeline', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('propagates correlation and causation from the request to the appended event', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    const [event] = await app.get(EventStore).load('vendor-acme-bakery');

    expect(event.metadata).toEqual(
      expect.objectContaining({
        correlationId: expect.any(String),
        causationId: expect.any(String),
      }),
    );
  });
});
