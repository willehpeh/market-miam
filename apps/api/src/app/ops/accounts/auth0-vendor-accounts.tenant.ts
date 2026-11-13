import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vendorAccountsContract, vendorAccountsContractEmails } from '@market-miam/testing';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0Users } from './auth0-users';
import { Auth0VendorAccounts } from './auth0-vendor-accounts';

// The VendorAccounts contract against a real Auth0 tenant, proving what FakeAuth0 assumes.
// Run by hand with `npx nx run api:test:tenant`, against a tenant kept for tests: its
// Management client needs read:users, create:users and delete:users, and the tenant needs the
// passwordless Email connection on. Each case deletes the contract's addresses first and after.

const PRODUCTION_TENANT = 'willalexander.eu.auth0.com';

// An address our Email value object accepts and, by FakeAuth0's account of it, Auth0 refuses.
const MALFORMED_FOR_AUTH0 = 'marie,dupont@example.com';

const issuer = process.env['AUTH0_TEST_ISSUER'];
const clientId = process.env['AUTH0_TEST_MGMT_CLIENT_ID'];
const clientSecret = process.env['AUTH0_TEST_MGMT_CLIENT_SECRET'];

if (!issuer || !clientId || !clientSecret) {
  throw new Error('Set AUTH0_TEST_ISSUER, AUTH0_TEST_MGMT_CLIENT_ID and AUTH0_TEST_MGMT_CLIENT_SECRET to a test tenant.');
}
if (new URL(issuer).host === PRODUCTION_TENANT) {
  throw new Error('The tenant contract creates and deletes users: point it at a test tenant, never production.');
}

const api = new Auth0ManagementApi(issuer, clientId, clientSecret);

async function expectOk(response: Response, what: string): Promise<Response> {
  if (!response.ok) {
    throw new Error(`Auth0 refused to ${what}: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function deleteUsersWith(email: string): Promise<void> {
  const found = await expectOk(await api.fetch(`api/v2/users-by-email?${new URLSearchParams({ email })}`), 'find users');
  for (const { user_id } of (await found.json()) as { user_id: string }[]) {
    await expectOk(await api.fetch(`api/v2/users/${encodeURIComponent(user_id)}`, { method: 'DELETE' }), 'delete a user');
  }
}

async function clear(): Promise<void> {
  for (const email of [...vendorAccountsContractEmails, MALFORMED_FOR_AUTH0]) {
    await deleteUsersWith(email);
  }
}

beforeEach(clear);
afterEach(clear);

vendorAccountsContract('Auth0VendorAccounts on a test tenant', async (existing) => {
  for (const { email, vendorId } of existing) {
    await expectOk(
      await api.fetch('api/v2/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ connection: 'email', email, app_metadata: vendorId ? { vendorId } : {} }),
      }),
      'create an existing account',
    );
  }
  return new Auth0VendorAccounts(new Auth0Users(api));
});

describe('Auth0VendorAccounts on a test tenant, beyond the contract', () => {
  // Proves the refusal FakeAuth0 copies: its wording is what the adapter recognises.
  it('answers email-refused for an address Auth0 finds malformed', async () => {
    const accounts = new Auth0VendorAccounts(new Auth0Users(api));

    expect(await accounts.openFor({ vendorId: 'vendor-id', email: MALFORMED_FOR_AUTH0 })).toBe('email-refused');
  });
});
