import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { PostgresHarness, startPostgres } from '@market-miam/testing';
import { DataKeys, SHREDDED, StoredEvent } from '@market-miam/event-sourcing';
import { bootProductionApp } from './testing/api-production-app';
import { eventually } from './testing/api-postgres-app';
import { FakeAuth0 } from './testing/fake-auth0';
import { OperatorApi } from './testing/operator-api';
import { VendorApi } from './testing/vendor-api';
import { Visitor } from './testing/visitor';

const MARIE = 'marie@example.com';

const legalIdentity = {
  siret: '73282932000074',
  legalName: 'Chez Marie SARL',
  address: '12 rue des Halles, 92330 Sceaux',
  contactEmail: 'contact@chez-marie.fr',
  phone: '06 12 34 56 78',
  vatRegime: 'assujetti',
  mediatorName: 'CM2C',
  mediatorUrl: 'https://www.cm2c.net',
  legalForm: 'SARL',
  shareCapital: '5000',
  registryCity: 'Nanterre',
  legalRepresentative: 'Marie Dupont',
};

const schedule = {
  scheduleId: 'schedule-1',
  startDate: '2026-12-01',
  market: { id: 'market-1', name: 'Marché de Sceaux', codePostal: '92330', town: 'Sceaux' },
  days: [{ day: 'TUE', startTime: '07:00', endTime: '13:00' }],
  frequency: { weeks: 1 },
};

const typesOf = (events: StoredEvent[]): string[] => events.map((event) => event.type);

// One vendor's whole life, on Postgres, through the api as production assembles it: invited,
// signed in, published, erased. Only the edges are faked: who signs in, Auth0's Management
// API, Cloudinary. Run by hand or nightly (`npx nx scenario api`), never in CI.
describe("A vendor's life, from invitation to erasure", () => {
  let postgres: PostgresHarness;
  let auth0: FakeAuth0;
  let app: INestApplication;

  beforeAll(async () => {
    postgres = await startPostgres();
    auth0 = new FakeAuth0();
    app = await bootProductionApp(postgres.connectionString, await auth0.start());
  });

  afterAll(async () => {
    await app?.close();
    await auth0?.stop();
    await postgres?.stop();
  });

  it('opens her account, lets her publish, and erases her, account and all', async () => {
    const ops = new OperatorApi(app);
    const visitor = new Visitor(app);

    // Invited: the processor opens her account in Auth0 and records it.
    const marie = await ops.inviteVendor(MARIE);
    const opened = await eventually(() => marie.history(), (events) => typesOf(events).includes('VendorAccountOpened'));
    expect(typesOf(opened)).toEqual(['VendorInvited', 'VendorAccountOpened']);
    expect(auth0.users).toEqual([{ connection: 'email', email: MARIE, app_metadata: { vendorId: marie.id } }]);

    // Signed in: the vendor app registers her, and a processor opens her storefront.
    const vendor = new VendorApi(app, marie.id, MARIE);
    await vendor.register().expect(201);
    await eventually(
      async () => (await vendor.storefront()).status,
      (status) => status === 200,
    );

    // Everything a storefront needs before it can go public.
    await vendor.editStorefront({ name: 'Chez Marie', description: 'Cuisine du marché', phone: '0102030405' }).expect(200);
    await vendor.setCoverPhoto(1).expect(200);
    await vendor
      .addItem({ itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté', price: 1300, allergens: [] })
      .expect(201);
    await vendor.registerSchedule(schedule).expect(201);
    await vendor.provideLegalIdentity(legalIdentity).expect(200);
    // By hand, as production assigns one until admin plan slice 3 gives the operator a route.
    await postgres.pool.query('INSERT INTO subdomain_registry (subdomain, vendor_id) VALUES ($1, $2)', ['chez-marie', marie.id]);
    await vendor.publish().expect(204);

    const published = await eventually(
      async () => (await visitor.storefront('chez-marie')).status,
      (status) => status === 200,
    );
    expect(published).toBe(200);

    // Erased: her key goes, her storefront and subdomain go, and her account closes.
    await ops.erase(marie.id).expect(202);
    const erased = await eventually(() => marie.history(), (events) => typesOf(events).includes('VendorAccountClosed'));

    expect(typesOf(erased)).toEqual([
      'VendorInvited',
      'VendorAccountOpened',
      'VendorRegistered',
      'VendorLegalIdentityProvided',
      'VendorErased',
      'VendorAccountClosed',
    ]);
    expect(erased[0].payload['email']).toBe(SHREDDED);
    expect(await app.get(DataKeys).findKeyFor(marie.id)).toBeNull();
    expect(auth0.users).toEqual([]);
    const gone = await eventually(
      async () => (await visitor.storefront('chez-marie')).status,
      (status) => status === 404,
    );
    expect(gone).toBe(404);
    await vendor.register().expect(400);
  });
});
