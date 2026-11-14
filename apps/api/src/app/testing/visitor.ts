import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';

// Someone on a storefront's public site, signed in as no one (ADR 0064).
export class Visitor {
  constructor(private readonly app: INestApplication) {}

  storefront(subdomain: string): Test {
    return request(this.app.getHttpServer()).get(`/public/storefront/${subdomain}`);
  }
}
