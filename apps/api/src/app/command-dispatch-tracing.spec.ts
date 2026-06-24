import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Clock, Email, Instant, LocalDate } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { TokenVerifier, VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { MarketDaysModule } from './market-days.module';

class FakeTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}

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

  beforeEach(async () => {
    exporter.reset();

    const vendor: VerifiedVendor = {
      vendorId: new VendorId('acme-bakery'),
      email: new Email('owner@acme.test'),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        AuthModule.forRootAsync({ useFactory: () => new FakeTokenVerifier(vendor) }),
        MarketDaysModule,
      ],
    })
      .overrideProvider(Clock)
      .useValue(fixedClock)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('opens a payload-blind span named for the dispatched command', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);

    const dispatchSpans = exporter
      .getFinishedSpans()
      .filter((span) => span.name === 'RegisterVendor');

    expect(dispatchSpans).toHaveLength(1);
    expect(dispatchSpans[0].attributes).toEqual({
      'command.name': 'RegisterVendor',
      'app.correlation_id': expect.any(String),
      'app.causation_id': expect.any(String),
    });
  });
});
