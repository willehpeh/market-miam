import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConcurrencyError, EventStore, StoredEvent } from '@market-miam/event-sourcing';
import { apiTestModule, startApp } from './testing/api-test-app';

// A losing append is the one failure the write path expects to lose fairly: two tabs, or a
// double-submit, both reading the same stream position. Racing two real requests to provoke
// it would depend on how their awaits interleave, so the store is stubbed at the port
// instead — the route, the command and the filter are all real.
class ConflictingEventStore extends EventStore {
  async load(): Promise<StoredEvent[]> {
    return [];
  }

  async append(): Promise<void> {
    throw new ConcurrencyError(0, 1);
  }
}

describe('A command that loses its append', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await startApp(
      apiTestModule().overrideProvider(EventStore).useValue(new ConflictingEventStore()),
    );
  });

  afterEach(async () => {
    await app.close();
  });

  it('answers 409, not 500 — the caller can retry', async () => {
    await request(app.getHttpServer())
      .post('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .send({ itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300 })
      .expect(409);
  });
});
