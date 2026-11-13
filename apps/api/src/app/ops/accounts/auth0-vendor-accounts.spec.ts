import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeAuth0 } from '../../testing/fake-auth0';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0VendorAccounts } from './auth0-vendor-accounts';

const CLIENT_ID = 'management-client';
const CLIENT_SECRET = 'management-secret';

describe('Auth0VendorAccounts', () => {
  let auth0: FakeAuth0;
  let issuer: string;

  const accounts = () => new Auth0VendorAccounts(new Auth0ManagementApi(issuer, CLIENT_ID, CLIENT_SECRET));

  beforeEach(async () => {
    auth0 = new FakeAuth0();
    issuer = await auth0.start();
  });

  afterEach(async () => {
    await auth0.stop();
  });

  it("opens the account on the vendors' email connection, carrying the vendorId", async () => {
    await accounts().openFor({ vendorId: 'vendor-id', email: 'marie@example.fr' });

    expect(auth0.users).toEqual([
      { connection: 'email', email: 'marie@example.fr', app_metadata: { vendorId: 'vendor-id' } },
    ]);
  });
});
