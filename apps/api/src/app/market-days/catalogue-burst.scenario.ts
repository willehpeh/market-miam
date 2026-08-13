import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PostgresHarness, startPostgres } from '@market-miam/testing';
import { bootPostgresApp, eventually } from '../testing/api-postgres-app';

const INSTANCES = 2;
const ITEMS = 200;

describe('A burst of catalogue commands across two instances', () => {
  let postgres: PostgresHarness;
  let apps: INestApplication[];

  beforeAll(async () => {
    postgres = await startPostgres();
    apps = await Promise.all(Array.from({ length: INSTANCES }, () => bootPostgresApp(postgres.connectionString)));
  });

  afterAll(async () => {
    await Promise.all(apps.map((app) => app.close()));
    await postgres.stop();
  });

  function add(app: INestApplication, index: number) {
    return request(app.getHttpServer())
      .post('/catalogue')
      .set('Authorization', 'Bearer any-token')
      .send({
        itemId: `item-${index}`,
        name: `Item ${index}`,
        description: 'Mijoté maison',
        price: 1000 + index,
        imageReference: `v1/dishes/acme-bakery/item-${index}`,
      });
  }

  function list(app: INestApplication) {
    return request(app.getHttpServer()).get('/catalogue').set('Authorization', 'Bearer any-token').expect(200);
  }

  it('answers every command 201 or 409, and converges both instances on the winners', async () => {
    // All at once, against one vendor — so one stream carries every write and the
    // losers are real lost appends, not a stubbed port. Whatever survives is what
    // both read models must agree on.
    const statuses = (await Promise.all(
      Array.from({ length: ITEMS }, (_, index) => add(apps[index % INSTANCES], index)),
    )).map((response) => response.status);

    expect(statuses.filter((status) => status !== 201 && status !== 409)).toEqual([]);
    const landed = statuses.filter((status) => status === 201).length;
    // A green tick alone says nothing about how much contention there actually was.
    console.log(`${landed}/${ITEMS} appends landed, ${ITEMS - landed} lost the race`);

    for (const app of apps) {
      const catalogue = await eventually(
        () => list(app).then((response) => response.body.items as unknown[]),
        (items) => items.length === landed,
      );
      expect(catalogue).toHaveLength(landed);
    }
  });
});
