import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import request from 'supertest';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';
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

  it('tells a signed-in operator who they are', async () => {
    await request(app.getHttpServer())
      .get('/ops/whoami')
      .set('Authorization', `Bearer ${OPERATOR_TOKEN}`)
      .expect(200, { operatorId: testOperator.operatorId });
  });

  it('refuses someone signed in who is not an operator', async () => {
    await request(app.getHttpServer())
      .get('/ops/whoami')
      .set('Authorization', `Bearer ${NOT_AN_OPERATOR_TOKEN}`)
      .expect(403);
  });

  it("refuses a vendor's token", async () => {
    await request(app.getHttpServer())
      .get('/ops/whoami')
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
