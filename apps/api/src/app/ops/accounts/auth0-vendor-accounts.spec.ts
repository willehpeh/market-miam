import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeAuth0 } from '../../testing/fake-auth0';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0VendorAccounts } from './auth0-vendor-accounts';

const CLIENT_ID = 'management-client';
const CLIENT_SECRET = 'management-secret';

const marie = { vendorId: 'vendor-id', email: 'marie@example.fr' };

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
    await accounts().openFor(marie);

    expect(auth0.users).toEqual([
      { connection: 'email', email: 'marie@example.fr', app_metadata: { vendorId: 'vendor-id' } },
    ]);
  });

  // Thrown, so the processor's subscription retries: the account may well not exist.
  it('fails when Auth0 refuses to open the account for another reason', async () => {
    auth0.createStatus = 500;

    await expect(accounts().openFor(marie)).rejects.toThrow(/500/);
  });

  it('fails when Auth0 refuses to say who holds a taken address', async () => {
    auth0.users = [{ connection: 'email', email: marie.email, app_metadata: { vendorId: 'another-vendor' } }];
    auth0.lookupStatus = 503;

    await expect(accounts().openFor(marie)).rejects.toThrow(/503/);
  });

  // An operator's GitHub account can share a vendor's address: Auth0 keeps users unique per
  // connection, so only an account on the email connection makes the address in use.
  it('opens the account when the address only belongs to a GitHub user', async () => {
    auth0.users = [{ connection: 'github', email: marie.email }];

    expect(await accounts().openFor(marie)).toBe('open');
    expect(auth0.users).toContainEqual({ connection: 'email', email: marie.email, app_metadata: { vendorId: marie.vendorId } });
  });
});
