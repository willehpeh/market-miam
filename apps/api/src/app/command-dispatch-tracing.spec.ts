import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SpanStatusCode } from '@opentelemetry/api';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import request from 'supertest';
import { Clock, Email, Instant, LocalDate } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { TokenVerifier, VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { EventStore, StoredEvent } from '@market-monster/event-sourcing';
import { MarketDaysModule } from './market-days.module';

class FakeTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}

// A persistence boundary that rehydrates empty but fails to persist, so the
// command handler throws and the failure propagates through the dispatcher.
class FailingEventStore extends EventStore {
  append(): Promise<void> {
    return Promise.reject(new Error('append unavailable'));
  }

  load(): Promise<StoredEvent[]> {
    return Promise.resolve([]);
  }
}

const vendor: VerifiedVendor = {
  vendorId: new VendorId('acme-bakery'),
  email: new Email('owner@acme.test'),
};

const fixedClock: Clock = {
  today: () => new LocalDate('2026-06-23'),
  now: () => new Instant('2026-06-23T09:00:00.000Z'),
};

// Hermetic span capture: a test-only provider with an in-memory exporter,
// registered once (the global provider is set-once per process). No auto-
// instrumentation, so getFinishedSpans() holds only spans our code creates.
// SimpleSpanProcessor exports synchronously on span end — no flush race.
const exporter = new InMemorySpanExporter();
new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
}).register();

describe('Command dispatch tracing', () => {
  let app: INestApplication;

  beforeEach(() => {
    exporter.reset();
  });

  afterEach(async () => {
    await app.close();
  });

  async function boot(configure: (builder: TestingModuleBuilder) => void = () => undefined) {
    const builder = Test.createTestingModule({
      imports: [
        AuthModule.forRootAsync({ useFactory: () => new FakeTokenVerifier(vendor) }),
        MarketDaysModule,
      ],
    })
      .overrideProvider(Clock)
      .useValue(fixedClock);

    configure(builder);

    app = (await builder.compile()).createNestApplication();
    await app.init();
  }

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

  it('marks the span as failed and records the exception when the handler throws', async () => {
    await boot((builder) => builder.overrideProvider(EventStore).useValue(new FailingEventStore()));

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
});
