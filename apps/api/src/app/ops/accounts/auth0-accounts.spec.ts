import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FakeAuth0 } from '../../testing/fake-auth0';
import { Auth0Accounts } from './auth0-accounts';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0Users } from './auth0-users';

const CLIENT_ID = 'management-client';
const CLIENT_SECRET = 'management-secret';

describe('Auth0Accounts', () => {
  let auth0: FakeAuth0;
  let issuer: string;
  let now: number;

  const accounts = () => new Auth0Accounts(new Auth0Users(new Auth0ManagementApi(issuer, CLIENT_ID, CLIENT_SECRET, () => now)));

  beforeEach(async () => {
    auth0 = new FakeAuth0();
    issuer = await auth0.start();
    now = 1_000_000;
  });

  afterEach(async () => {
    await auth0.stop();
  });

  it('lists every account with its vendor id, page by page', async () => {
    auth0.users = Array.from({ length: 150 }, (_, i) => ({
      email: `vendor${i}@x.test`,
      app_metadata: { vendorId: `vendor-${i}` },
    }));

    const listed = await accounts().all();

    expect(listed).toHaveLength(150);
    expect(listed[149]).toEqual({ email: 'vendor149@x.test', vendorId: 'vendor-149' });
    expect(auth0.userPages.map((page) => page.get('page'))).toEqual(['0', '1']);
    expect(auth0.userPages[0].get('fields')).toBe('email,app_metadata');
  });

  it('gives null for an account without an email or a vendor id', async () => {
    auth0.users = [{}];

    expect(await accounts().all()).toEqual([{ email: null, vendorId: null }]);
  });

  it('asks Auth0 for a Management API token with its client credentials', async () => {
    await accounts().all();

    expect(auth0.tokenRequests).toEqual([
      {
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        audience: `${issuer}api/v2/`,
      },
    ]);
  });

  it('reuses its token while it is valid, even for lists started together', async () => {
    const directory = accounts();

    await Promise.all([directory.all(), directory.all()]);
    await directory.all();

    expect(auth0.tokenRequests).toHaveLength(1);
  });

  it('asks for a new token a minute before the current one expires', async () => {
    auth0.expiresInSeconds = 3600;
    const directory = accounts();
    await directory.all();

    now += 3600 * 1000 - 59_000;
    await directory.all();

    expect(auth0.tokenRequests).toHaveLength(2);
  });

  it('fails without leaking the secret when Auth0 refuses the credentials', async () => {
    auth0.tokenStatus = 401;

    const failure = accounts().all();

    await expect(failure).rejects.toThrow(/401/);
    await expect(failure).rejects.not.toThrow(new RegExp(CLIENT_SECRET));
  });

  it('asks for a fresh token after a refused one, rather than keeping the failure', async () => {
    auth0.tokenStatus = 401;
    const directory = accounts();
    await expect(directory.all()).rejects.toThrow();

    auth0.tokenStatus = 200;

    await expect(directory.all()).resolves.toEqual([]);
  });

  it('fails when Auth0 refuses the user list', async () => {
    auth0.usersStatus = 403;

    await expect(accounts().all()).rejects.toThrow(/403/);
  });
});
