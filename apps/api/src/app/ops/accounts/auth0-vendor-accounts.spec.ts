import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeAuth0 } from '../../testing/fake-auth0';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0Users } from './auth0-users';
import { Auth0VendorAccounts } from './auth0-vendor-accounts';

const CLIENT_ID = 'management-client';
const CLIENT_SECRET = 'management-secret';

const marie = { vendorId: 'vendor-id', email: 'marie@example.fr' };

describe('Auth0VendorAccounts', () => {
  let auth0: FakeAuth0;
  let issuer: string;

  const accounts = () => new Auth0VendorAccounts(new Auth0Users(new Auth0ManagementApi(issuer, CLIENT_ID, CLIENT_SECRET)));

  beforeEach(async () => {
    auth0 = new FakeAuth0();
    issuer = await auth0.start();
  });

  afterEach(async () => {
    await auth0.stop();
  });

  // The address stays unverified: the operator may have mistyped it, and only the vendor's first
  // sign-in proves the inbox.
  it("opens the account on the vendors' email connection, carrying the vendorId", async () => {
    await accounts().openFor(marie);

    expect(auth0.users).toEqual([
      { connection: 'email', email: 'marie@example.fr', app_metadata: { vendorId: 'vendor-id' } },
    ]);
  });

  // Auth0's user search is full-text: whatever it answers, only the vendor's own account goes.
  it("closes only the account holding exactly the vendor's id", async () => {
    const rose = { connection: 'email', email: 'rose@example.fr', app_metadata: { vendorId: 'vendor-id-2' } };
    auth0.users = [{ connection: 'email', email: marie.email, app_metadata: { vendorId: marie.vendorId } }, rose];
    auth0.looseSearch = true;

    await accounts().closeFor({ vendorId: marie.vendorId });

    expect(auth0.users).toEqual([rose]);
  });

  // Thrown, so the processor's subscription retries: the account may well not exist.
  it('fails when Auth0 refuses to open the account for another reason', async () => {
    auth0.createStatus = 500;

    await expect(accounts().openFor(marie)).rejects.toThrow(/500/);
  });

  // Auth0 checks addresses more strictly than our Email: such an invitation can never become an
  // account, so the processor erases it instead of retrying it forever.
  it('answers email-refused when Auth0 refuses the address itself', async () => {
    auth0.refusesEmails = true;

    expect(await accounts().openFor({ ...marie, email: 'marie,dupont@example.fr' })).toBe('email-refused');
  });

  // Any other 400 may be ours to fix: thrown, it stalls the processor and alerts, losing nothing.
  it('fails when Auth0 refuses the request for another reason', async () => {
    auth0.createStatus = 400;

    await expect(accounts().openFor(marie)).rejects.toThrow(/400/);
  });

  // The code says what to fix, as Auth0's answer to a connection not enabled for the Management
  // application would have. The message stays out: it can name the address.
  it("names Auth0's error code when it refuses the request", async () => {
    auth0.createStatus = 400;
    auth0.createErrorCode = 'inexistent_connection';

    await expect(accounts().openFor(marie)).rejects.toThrow('Auth0 refused to create a user: 400 inexistent_connection');
  });

  it('fails when Auth0 refuses to say who holds a taken address', async () => {
    auth0.users = [{ connection: 'email', email: marie.email, app_metadata: { vendorId: 'another-vendor' } }];
    auth0.lookupStatus = 503;

    await expect(accounts().openFor(marie)).rejects.toThrow(/503/);
  });
});
