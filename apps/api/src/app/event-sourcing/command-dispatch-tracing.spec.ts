import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { EMPTY, Observable } from 'rxjs';
import { EventStore, InMemoryEventStore, StoredEvent } from '@market-miam/event-sourcing';
import { apiTestModule, bootApiTestApp, fixedClock, startApp } from '../testing/api-test-app';
import { registerSpanCapture } from '../testing/span-capture';

class FailingEventStore extends EventStore {
  append(): Promise<void> {
    return Promise.reject(new Error('append unavailable'));
  }

  load(): Promise<StoredEvent[]> {
    return Promise.resolve([]);
  }

  notifications(): Observable<void> {
    return EMPTY;
  }
}

const exporter = registerSpanCapture();

describe('Command dispatch tracing', () => {
  let app: INestApplication;

  beforeEach(() => {
    exporter.reset();
  });

  afterEach(async () => {
    await app.close();
  });

  const boot = async () => {
    app = await bootApiTestApp({ clock: fixedClock });
  };

  const register = () =>
    request(app.getHttpServer()).post('/vendors').set('Authorization', 'Bearer any-token');

  const dispatchSpan = () =>
    exporter.getFinishedSpans().filter((span) => span.name === 'RegisterVendor');

  it('opens a payload-blind span named for the dispatched command', async () => {
    await boot();

    await register().expect(201);

    const spans = dispatchSpan();
    expect(spans).toHaveLength(1);
    expect(spans[0].attributes).toEqual({
      'command.name': 'RegisterVendor',
      'app.correlation_id': expect.any(String),
      'app.causation_id': expect.any(String),
    });
  });

  it('opens an append span on the same trace, carrying the persisted event facts', async () => {
    await boot();

    await register().expect(201);

    const spans = exporter.getFinishedSpans();
    const dispatch = spans.find((span) => span.name === 'RegisterVendor');
    const appends = spans.filter((span) => span.name === 'event-store append');

    expect(appends).toHaveLength(1);
    expect(appends[0].attributes).toEqual({
      'event.type': 'VendorRegistered',
      'event.count': 1,
      stream_id: 'vendor-acme-bakery',
      'vendor.id': 'acme-bakery',
    });
    expect(appends[0].spanContext().traceId).toBe(dispatch?.spanContext().traceId);
  });

  it('injects the producing trace context into the appended event metadata', async () => {
    await boot();

    await register().expect(201);

    const [event] = await app.get(EventStore).load('vendor-acme-bakery');
    const append = exporter.getFinishedSpans().find((span) => span.name === 'event-store append');

    const traceparent = event.metadata?.['traceparent'] as string;
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/);
    expect(traceparent).toContain(append?.spanContext().traceId);
  });

  it('opens a load span on the same trace when rehydrating', async () => {
    await boot();

    await register().expect(201);

    const spans = exporter.getFinishedSpans();
    const dispatch = spans.find((span) => span.name === 'RegisterVendor');
    const loads = spans.filter((span) => span.name === 'event-store load');

    expect(loads).toHaveLength(1);
    expect(loads[0].attributes).toEqual({
      stream_id: 'vendor-acme-bakery',
      'event.count': 0,
    });
    expect(loads[0].spanContext().traceId).toBe(dispatch?.spanContext().traceId);
  });

  it('marks the span as failed and records the exception when the handler throws', async () => {
    app = await startApp(
      apiTestModule({ clock: fixedClock }).overrideProvider(EventStore).useValue(new FailingEventStore()),
    );

    await register().expect(500);

    const spans = dispatchSpan();
    expect(spans).toHaveLength(1);
    expect(spans[0].status.code).toBe(SpanStatusCode.ERROR);
    expect(spans[0].events.map((event) => event.name)).toContain('exception');
    expect(spans[0].attributes).toEqual({
      'command.name': 'RegisterVendor',
      'app.correlation_id': expect.any(String),
      'app.causation_id': expect.any(String),
      'exception.slug': 'command-dispatch-failed',
    });
  });

  it('marks the append span as failed and records the exception when persistence throws', async () => {
    app = await startApp(
      apiTestModule({ clock: fixedClock })
        .overrideProvider(InMemoryEventStore)
        .useValue(new FailingEventStore()),
    );

    await register().expect(500);

    const appends = exporter
      .getFinishedSpans()
      .filter((span) => span.name === 'event-store append');

    expect(appends).toHaveLength(1);
    expect(appends[0].status.code).toBe(SpanStatusCode.ERROR);
    expect(appends[0].events.map((event) => event.name)).toContain('exception');
    expect(appends[0].attributes).toEqual({
      'event.type': 'VendorRegistered',
      'event.count': 1,
      stream_id: 'vendor-acme-bakery',
      'vendor.id': 'acme-bakery',
      'exception.slug': 'event-store-append-failed',
    });
  });
});
