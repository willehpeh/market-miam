import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
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

  it('wraps a discovered projection so its event handling is traced', async () => {
    await openStorefrontFor(app, 'acme-bakery');
    await app.get(ConsumerRunner).drain();

    const handled = exporter
      .getFinishedSpans()
      .filter((span) => span.name === 'event-handler handle')
      .map((span) => span.attributes['event.type']);

    expect(handled).toContain('StorefrontOpened');
  });
});
