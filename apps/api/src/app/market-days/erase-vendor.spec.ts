import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Subject } from 'rxjs';
import { Clock, Instant, LocalDate } from '@market-miam/common';
import { CommandGateway, DataKeys, EventStore, SHREDDED } from '@market-miam/event-sourcing';
import { EraseVendor, InMemorySubdomainRegistry, VendorLegalIdentityProvided } from '@market-miam/market-days';
import { apiTestModule, bootApiTestApp, FIXED_NOW, startApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';
import { SHRED_SWEEP_TICKS } from './shred-sweep';

const authed = (app: INestApplication, method: 'post' | 'put' | 'get', url: string) =>
  request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

async function registerWithStorefront(app: INestApplication): Promise<void> {
  await authed(app, 'post', '/vendors').expect(201);
  await app.get(Subscriptions).drain();
  await authed(app, 'put', '/storefront')
    .send({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' })
    .expect(200);
  await app.get(Subscriptions).drain();
}

async function erase(app: INestApplication): Promise<void> {
  await app.get(CommandGateway).execute(new EraseVendor('acme-bakery', FIXED_NOW));
  await app.get(Subscriptions).drain();
}

describe('Erasing a vendor', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
    await registerWithStorefront(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it("shreds the vendor's key and drops their storefront view", async () => {
    await erase(app);

    expect(await app.get(DataKeys).findKeyFor('acme-bakery')).toBeNull();
    await authed(app, 'get', '/storefront').expect(404);
  });

  it('keeps the storefront view dropped when it is rebuilt', async () => {
    await erase(app);

    await app.get(Subscriptions).rebuild('vendor-storefront-view');

    await authed(app, 'get', '/storefront').expect(404);
  });

  it('refuses PII the erased vendor writes afterwards, rather than sealing it under a fresh key', async () => {
    await erase(app);

    await authed(app, 'put', '/storefront')
      .send({ name: 'Acme Again', description: 'Back from the dead', phone: '0607080910' })
      .expect(500);
  });

  it('refuses to register the erased vendor again', async () => {
    await erase(app);

    await authed(app, 'post', '/vendors').expect(400);
  });

  it("removes the vendor's public storefront", async () => {
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');
    await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);

    await erase(app);

    await request(app.getHttpServer()).get('/public/storefront/acme').expect(404);
  });
});

describe("The erased vendor's legal identity", () => {
  let app: INestApplication;
  let now: string;
  let sweepTicks: Subject<void>;

  const clock: Clock = {
    today: () => new LocalDate(now.slice(0, 10)),
    now: () => new Instant(now),
  };

  const provided: VendorLegalIdentityProvided = {
    type: 'VendorLegalIdentityProvided',
    version: 1,
    payload: {
      vendorId: 'acme-bakery',
      siret: '73282932000074',
      siren: '732829320',
      vatNumber: 'FR44732829320',
      legalName: 'Marie Dupont',
      address: '12 rue des Halles, 92330 Sceaux',
      contactEmail: 'contact@chez-marie.fr',
      phone: '06 12 34 56 78',
      vatRegime: 'assujetti',
      mediatorName: null,
      mediatorUrl: null,
      legalForm: null,
      shareCapital: null,
      registryCity: null,
      legalRepresentative: null,
    },
  };

  const legalName = async (): Promise<unknown> => {
    const events = await app.get(EventStore).load('vendor-acme-bakery');
    return events.find((event) => event.type === 'VendorLegalIdentityProvided')?.payload['legalName'];
  };

  // In memory, a sweep tick has shredded synchronously by the time next() returns.
  const sweepAt = (instant: string) => {
    now = instant;
    sweepTicks.next();
  };

  beforeEach(async () => {
    now = FIXED_NOW;
    sweepTicks = new Subject<void>();
    app = await startApp(apiTestModule({ clock }).overrideProvider(SHRED_SWEEP_TICKS).useValue(sweepTicks));
    await authed(app, 'post', '/vendors').expect(201);
    await app.get(EventStore).append('vendor-acme-bakery', [provided], 1, { vendorId: 'acme-bakery' });
    await erase(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('is kept for five years after the erasure', async () => {
    sweepAt('2031-06-23T08:59:59.999Z');

    expect(await legalName()).toBe('Marie Dupont');
  });

  it('is shredded once five years have passed', async () => {
    sweepAt('2031-06-23T09:00:00.000Z');

    expect(await legalName()).toBe(SHREDDED);
  });
});
