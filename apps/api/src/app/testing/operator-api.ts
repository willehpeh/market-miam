import { INestApplication, RequestMethod } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import request, { Test } from 'supertest';
import { OPERATOR_TOKEN } from './fake-operator-token-verifier';
import { VendorOnRecord } from './vendor-on-record';

type Verb = 'get' | 'post' | 'put' | 'patch' | 'delete';

export type Route = { verb: Verb; path: string };

// The operator API as its caller uses it, signed with the caller's token: the operator's by
// default, or none (ADR 0064).
export class OperatorApi {
  constructor(
    private readonly app: INestApplication,
    private readonly token: string | null = OPERATOR_TOKEN,
  ) {}

  accounts(): Test {
    return this.call({ verb: 'get', path: '/ops/accounts' });
  }

  invite(email: string): Test {
    return this.call({ verb: 'post', path: '/ops/vendors' }).send({ email });
  }

  // The vendor an accepted invitation minted, for the next step.
  async inviteVendor(email: string): Promise<VendorOnRecord> {
    const { vendorId } = (await this.invite(email).expect(202)).body as { vendorId: string };
    return new VendorOnRecord(this.app, vendorId);
  }

  erase(vendorId: string): Test {
    return this.call({ verb: 'post', path: `/ops/vendors/${vendorId}/erasure` });
  }

  // Every route under ops/, read from the controllers Nest registered, so a route added
  // tomorrow is in the list without anyone writing it here.
  routes(): Route[] {
    const routes: Route[] = [];
    for (const module of this.app.get(ModulesContainer).values()) {
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

  call({ verb, path }: Route): Test {
    const call = request(this.app.getHttpServer())[verb](path);
    return this.token === null ? call : call.set('Authorization', `Bearer ${this.token}`);
  }
}
