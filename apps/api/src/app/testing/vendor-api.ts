import { INestApplication } from '@nestjs/common';
import request, { Test } from 'supertest';
import { NamingTokenVerifier } from './naming-token-verifier';

type Verb = 'get' | 'post' | 'put';

// The vendor API as the vendor app calls it, signed in as one vendor (ADR 0064).
export class VendorApi {
  private readonly token: string;

  constructor(
    private readonly app: INestApplication,
    vendorId: string,
    email: string,
  ) {
    this.token = NamingTokenVerifier.tokenFor(vendorId, email);
  }

  register(): Test {
    return this.call('post', '/vendors');
  }

  storefront(): Test {
    return this.call('get', '/storefront');
  }

  editStorefront(information: { name: string; description: string; phone?: string }): Test {
    return this.call('put', '/storefront').send(information);
  }

  setCoverPhoto(version: number): Test {
    return this.call('put', '/storefront/cover-photo').send({ version });
  }

  addItem(item: object): Test {
    return this.call('post', '/catalogue').send(item);
  }

  registerSchedule(schedule: object): Test {
    return this.call('post', '/market-schedules').send(schedule);
  }

  provideLegalIdentity(identity: object): Test {
    return this.call('put', '/legal-identity').send(identity);
  }

  publish(): Test {
    return this.call('post', '/storefront/publish');
  }

  private call(verb: Verb, path: string): Test {
    return request(this.app.getHttpServer())[verb](path).set('Authorization', `Bearer ${this.token}`);
  }
}
