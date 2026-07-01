import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { VendorStorefrontView, VendorStorefrontViews } from '@market-monster/market-days';
import { apiTestModule, bootApiTestApp, startApp } from '../testing/api-test-app';
import { registerSpanCapture } from '../testing/span-capture';

class FailingViews extends VendorStorefrontViews {
  findByVendor(): Promise<VendorStorefrontView | undefined> {
    return Promise.reject(new Error('read model unavailable'));
  }
}

const exporter = registerSpanCapture();

describe('Query dispatch tracing', () => {
  let app: INestApplication;

  beforeEach(() => {
    exporter.reset();
  });

  afterEach(async () => {
    await app.close();
  });

  const view = () =>
    request(app.getHttpServer()).get('/storefront').set('Authorization', 'Bearer any-token');

  const dispatchSpan = () =>
    exporter.getFinishedSpans().filter((span) => span.name === 'FindVendorStorefront');

  it('opens a payload-blind span named for the dispatched query', async () => {
    app = await bootApiTestApp();

    await view();

    const spans = dispatchSpan();
    expect(spans).toHaveLength(1);
    expect(spans[0].attributes).toEqual({
      'query.name': 'FindVendorStorefront',
    });
  });

  it('marks the span as failed and records the exception when the read model throws', async () => {
    app = await startApp(
      apiTestModule().overrideProvider(VendorStorefrontViews).useValue(new FailingViews()),
    );

    await view().expect(500);

    const spans = dispatchSpan();
    expect(spans).toHaveLength(1);
    expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
    expect(spans[0].events.map((event) => event.name)).toContain('exception');
    expect(spans[0].attributes).toEqual({
      'query.name': 'FindVendorStorefront',
      'exception.slug': 'query-dispatch-failed',
    });
  });
});
