import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { CommandGateway } from '@market-miam/event-sourcing';
import { EraseVendor } from '@market-miam/market-days';
import { bootApiTestApp, FIXED_NOW } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

const identity = {
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

describe('The vendor providing their legal identity over HTTP', () => {
  let app: INestApplication;

  const authed = (method: 'post' | 'put' | 'get', url: string) =>
    request(app.getHttpServer())[method](url).set('Authorization', 'Bearer any-token');

  beforeEach(async () => {
    app = await bootApiTestApp();
    await authed('post', '/vendors').expect(201);
    await app.get(Subscriptions).drain();
  });

  afterEach(async () => {
    await app.close();
  });

  it('has nothing to show before the vendor provides one', async () => {
    await authed('get', '/legal-identity').expect(404);
  });

  it('shows the vendor the identity they provided', async () => {
    await authed('put', '/legal-identity').send(identity).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/legal-identity').expect(200);

    expect(response.body).toEqual(identity);
  });

  it('reads an EI without médiateur or société details as nulls', async () => {
    const ei = { ...identity, legalName: 'Marie Dupont', mediatorName: null, mediatorUrl: null, legalForm: null, shareCapital: null, registryCity: null, legalRepresentative: null };
    await authed('put', '/legal-identity').send(ei).expect(200);
    await app.get(Subscriptions).drain();

    const response = await authed('get', '/legal-identity').expect(200);

    expect(response.body).toEqual(ei);
  });

  it('rejects a SIRET that fails its check digit, from the domain', async () => {
    const response = await authed('put', '/legal-identity').send({ ...identity, siret: '73282932000075' }).expect(400);

    expect(response.body.message).toContain('SIRET');
  });

  describe('once the vendor is erased', () => {
    beforeEach(async () => {
      await authed('put', '/legal-identity').send(identity).expect(200);
      await app.get(Subscriptions).drain();
      await app.get(CommandGateway).execute(new EraseVendor('acme-bakery', FIXED_NOW));
      await app.get(Subscriptions).drain();
    });

    it('shows nothing, even after the view is rebuilt from the log', async () => {
      await authed('get', '/legal-identity').expect(404);

      await app.get(Subscriptions).rebuild('vendor-legal-identity-view');

      await authed('get', '/legal-identity').expect(404);
    });

    it('refuses a new identity', async () => {
      await authed('put', '/legal-identity').send(identity).expect(400);
    });
  });
});
