import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Subject } from 'rxjs';
import { Clock, Instant, LocalDate } from '@market-miam/common';
import { DataKeys, EventStore, SHREDDED } from '@market-miam/event-sourcing';
import {
  InMemorySubdomainRegistry,
  VendorLegalIdentityProvided,
  VendorStorefrontViews,
  VendorStorefrontViewStore,
} from '@market-miam/market-days';
import { apiTestModule, bootApiTestApp, FIXED_NOW, startApp } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';
import { VendorErasure } from './vendor-erasure';
import { SHRED_SWEEP_TICKS } from './shred-sweep';

describe('Erasing a vendor', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('shreds the key and rebuilds the read model with the sentinel', async () => {
    // acme-bakery is the authenticated vendor; register + edit lands plaintext PII
    // (name/description/phone) in the storefront view.
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);
    await app.get(Subscriptions).drain();

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' })
      .expect(200);
    await app.get(Subscriptions).drain();

    // A row with no backing events. The erased vendor's own row would come back as
    // the sentinel either way — editInformation is last-write-wins, so the replay
    // overwrites it whether or not the projection cleared first. Only a row replay
    // cannot recreate proves the clear actually ran, so this is what makes the
    // assertion below depend on the erasure mechanism rather than on overwriting.
    await app.get(VendorStorefrontViewStore).editInformation('ghost-vendor', {
      name: 'Ghost',
      description: 'no events',
      phone: '',
    });

    await app.get(VendorErasure).erase('acme-bakery');

    // The key is gone, so replay decrypts the PII fields to the sentinel.
    expect(await app.get(DataKeys).findKeyFor('acme-bakery')).toBeNull();
    expect(await app.get(VendorStorefrontViews).findByVendor('ghost-vendor')).toBeUndefined();

    const view = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(view.body).toEqual({
      name: SHREDDED,
      description: SHREDDED,
      phone: SHREDDED,
      imageReference: '',
      published: false,
      cartePricesVisible: true,
      subdomain: null,
    });
  });

  it('refuses PII the erased vendor writes afterwards, rather than sealing it under a fresh key', async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);
    await app.get(Subscriptions).drain();
    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' })
      .expect(200);
    await app.get(Subscriptions).drain();

    await app.get(VendorErasure).erase('acme-bakery');

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Again', description: 'Back from the dead', phone: '0607080910' })
      .expect(500);
    await app.get(Subscriptions).drain();

    const view = await request(app.getHttpServer())
      .get('/storefront')
      .set('Authorization', 'Bearer any-token')
      .expect(200);
    expect(view.body.name).toBe(SHREDDED);
  });

  it("removes the vendor's public storefront", async () => {
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);
    await app.get(Subscriptions).drain();

    await request(app.getHttpServer())
      .put('/storefront')
      .set('Authorization', 'Bearer any-token')
      .send({ name: 'Acme Bakery', description: 'Fresh bread daily', phone: '0102030405' })
      .expect(200);
    await app.get(Subscriptions).drain();

    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');
    await request(app.getHttpServer()).get('/public/storefront/acme').expect(200);

    await app.get(VendorErasure).erase('acme-bakery');

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
    await request(app.getHttpServer())
      .post('/vendors')
      .set('Authorization', 'Bearer any-token')
      .expect(201);
    await app.get(EventStore).append('vendor-acme-bakery', [provided], 1, { vendorId: 'acme-bakery' });
    await app.get(VendorErasure).erase('acme-bakery');
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
