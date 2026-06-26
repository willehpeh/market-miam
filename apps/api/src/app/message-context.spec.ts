import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EventStore } from '@market-monster/event-sourcing';
import { bootApiTestApp } from './testing/api-test-app';

describe('Message context through the request pipeline', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // Message context carries only generated IDs, never domain data, so the command
  // is just a vehicle: the point is to exercise the real middleware -> bus ->
  // handler -> append chain across the async boundary, which a unit test can't.
  // RegisterVendor is chosen because it is the entry-point command — no
  // preconditions, no arrangement, one event. The stamping/generation mechanics
  // are unit-tested in event-sourcing's message-context.spec.ts.
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
