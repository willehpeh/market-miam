import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Email } from '@market-monster/common';
import { VendorId } from '@market-monster/shared-kernel';
import { TokenVerifier, VerifiedVendor } from '@market-monster/auth';
import { AuthModule } from '@market-monster/auth-nestjs';
import { Subscription } from '@market-monster/event-sourcing';
import { MarketDaysModule } from './market-days.module';

class FakeTokenVerifier extends TokenVerifier {
  constructor(private readonly vendor: VerifiedVendor) {
    super();
  }

  verify(): Promise<VerifiedVendor> {
    return Promise.resolve(this.vendor);
  }
}

const exporter = new InMemorySpanExporter();
new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
}).register();

describe('Storefront consumer tracing', () => {
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
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('handles each event on a new trace linked back to the producer, with lag', async () => {
    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily' })
      .expect(200);

    await app.get(Subscription).poll();

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
