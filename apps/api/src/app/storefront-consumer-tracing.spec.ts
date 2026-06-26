import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { bootApiTestApp, openStorefrontFor } from './testing/api-test-app';
import { registerSpanCapture } from './testing/span-capture';
import { ConsumerRunner } from './consumer-runner';

const exporter = registerSpanCapture();

describe('Storefront consumer tracing', () => {
  let app: INestApplication;

  beforeEach(async () => {
    exporter.reset();
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('handles each event on a new trace linked back to the producer, with lag', async () => {
    await openStorefrontFor(app, 'acme-bakery');
    await app.get(ConsumerRunner).drain();
    exporter.reset();

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily' })
      .expect(200);

    await app.get(ConsumerRunner).drain();

    const spans = exporter.getFinishedSpans();
    const append = spans.find((span) => span.name === 'event-store append');
    const handle = spans.find((span) => span.name === 'event-handler handle');

    expect(handle).toBeDefined();
    // A new trace, not a child of the producer.
    expect(handle?.spanContext().traceId).not.toBe(append?.spanContext().traceId);
    // ...but linked back to the producing span via the stored traceparent.
    expect(handle?.links.map((link) => link.context.traceId)).toEqual([
      append?.spanContext().traceId,
    ]);
    expect(handle?.attributes).toEqual({
      'event.type': 'StorefrontInformationEdited',
      'vendor.id': 'acme-bakery',
      'processing.lag_ms': expect.any(Number),
    });
  });
});
