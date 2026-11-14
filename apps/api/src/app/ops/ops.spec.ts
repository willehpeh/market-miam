import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { Events, EventStore } from '@market-miam/event-sourcing';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp, FIXED_NOW, fixedClock } from '../testing/api-test-app';
import { NOT_AN_OPERATOR_TOKEN, OPERATOR_TOKEN, testOperator } from '../testing/fake-operator-token-verifier';

type Verb = 'get' | 'post' | 'put' | 'patch' | 'delete';

// Every route the app serves under ops/, read from the controllers Nest registered —
// so a route added tomorrow is covered by the anonymous check below without anyone
// listing it here.
function opsRoutes(app: INestApplication): Array<{ verb: Verb; path: string }> {
  const routes: Array<{ verb: Verb; path: string }> = [];
  for (const module of app.get(ModulesContainer).values()) {
    for (const { metatype } of module.controllers.values()) {
      if (!metatype) {
        continue;
      }
      const base = String(Reflect.getMetadata(PATH_METADATA, metatype) ?? '');
      const prototype = metatype.prototype as Record<string, object>;
      for (const name of Object.getOwnPropertyNames(prototype)) {
        const handler = prototype[name];
        const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
        if (method === undefined) {
          continue;
        }
        const path = `/${base}/${String(Reflect.getMetadata(PATH_METADATA, handler) ?? '')}`
          .replace(/:[^/]+/g, 'any')
          .replace(/\/+/g, '/');
        if (path.startsWith('/ops')) {
          routes.push({ verb: RequestMethod[method].toLowerCase() as Verb, path });
        }
      }
    }
  }
  return routes;
}

describe('The operator API', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await bootApiTestApp({
      clock: fixedClock,
      accounts: [
        { email: 'owner@brioche.test', vendorId: 'brioche-co' },
        { email: 'owner@acme.test', vendorId: 'acme-bakery' },
        { email: 'operator@marketmiam.test', vendorId: null },
        { email: null, vendorId: 'no-email-vendor' },
      ],
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists every account with its vendor and subdomain, ordered by email', async () => {
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');

    await request(app.getHttpServer())
      .get('/ops/accounts')
      .set('Authorization', `Bearer ${OPERATOR_TOKEN}`)
      .expect(200, [
        { email: 'operator@marketmiam.test', vendorId: null, subdomain: null },
        { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' },
        { email: 'owner@brioche.test', vendorId: 'brioche-co', subdomain: null },
        { email: null, vendorId: 'no-email-vendor', subdomain: null },
      ]);
  });

  const invite = (email: string) =>
    request(app.getHttpServer()).post('/ops/vendors').set('Authorization', `Bearer ${OPERATOR_TOKEN}`).send({ email });

  // The vendorId minted for an invitation the api accepted.
  const invited = async (email: string): Promise<string> =>
    ((await invite(email).expect(202)).body as { vendorId: string }).vendorId;

  it('invites a vendor, answering with the vendorId it minted', async () => {
    const response = await invite('marie@example.com').expect(202);

    const { vendorId } = response.body as { vendorId: string };
    expect(vendorId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(await app.get(EventStore).load(`vendor-${vendorId}`)).toEqual([
      expect.objectContaining({
        type: 'VendorInvited',
        payload: { vendorId, invitedAt: FIXED_NOW, email: 'marie@example.com' },
      }),
    ]);
  });

  const invitations = async () =>
    (await app.get(Events).loadFrom(0, 100)).filter((event) => event.type === 'VendorInvited');

  it('refuses an address an account already holds, and records nothing', async () => {
    await invite('owner@acme.test').expect(409);

    expect(await invitations()).toEqual([]);
  });

  it('refuses a malformed address, and records nothing', async () => {
    await invite('marie@example').expect(400);

    expect(await invitations()).toEqual([]);
  });

  // Auth0 keeps addresses in lower case: compared any other way, a held one would slip through.
  it('refuses a held address typed in another case', async () => {
    await invite('Owner@ACME.test').expect(409);
  });

  it('records the address in lower case, as its account will hold it', async () => {
    const vendorId = await invited('Marie@Example.COM');

    expect((await app.get(EventStore).load(`vendor-${vendorId}`))[0].payload).toMatchObject({ email: 'marie@example.com' });
  });

  it("records the operator's Auth0 id in the invitation's metadata", async () => {
    const vendorId = await invited('marie@example.com');

    const [invitation] = await app.get(EventStore).load(`vendor-${vendorId}`);
    expect(invitation.metadata).toMatchObject({ operatorId: testOperator.operatorId });
  });

  const erase = (vendorId: string) =>
    request(app.getHttpServer()).post(`/ops/vendors/${vendorId}/erasure`).set('Authorization', `Bearer ${OPERATOR_TOKEN}`);

  // Accepted, not done: the processors carry the erasure out (ADR 0058).
  it('erases a vendor', async () => {
    const vendorId = await invited('marie@example.com');

    await erase(vendorId).expect(202);

    expect(await app.get(EventStore).load(`vendor-${vendorId}`)).toContainEqual(
      expect.objectContaining({ type: 'VendorErased', payload: { vendorId, erasedAt: FIXED_NOW } }),
    );
  });

  it("records the operator's Auth0 id in the erasure's metadata", async () => {
    const vendorId = await invited('marie@example.com');

    await erase(vendorId).expect(202);

    const erased = (await app.get(EventStore).load(`vendor-${vendorId}`)).find((event) => event.type === 'VendorErased');
    expect(erased?.metadata).toMatchObject({ operatorId: testOperator.operatorId });
  });

  it('refuses to erase a vendor who was never invited or registered', async () => {
    await erase('nobody').expect(400);

    expect(await app.get(EventStore).load('vendor-nobody')).toEqual([]);
  });

  it('refuses someone signed in who is not an operator', async () => {
    await request(app.getHttpServer())
      .get('/ops/accounts')
      .set('Authorization', `Bearer ${NOT_AN_OPERATOR_TOKEN}`)
      .expect(403);
  });

  it("refuses a vendor's token", async () => {
    await request(app.getHttpServer())
      .get('/ops/accounts')
      .set('Authorization', 'Bearer a-vendor-token')
      .expect(401);
  });

  it('refuses every operator route to an anonymous caller', async () => {
    const routes = opsRoutes(app);
    expect(routes.length).toBeGreaterThan(0);

    for (const { verb, path } of routes) {
      const response = await request(app.getHttpServer())[verb](path);
      expect({ verb, path, status: response.status }).toEqual({ verb, path, status: 401 });
    }
  });
});
