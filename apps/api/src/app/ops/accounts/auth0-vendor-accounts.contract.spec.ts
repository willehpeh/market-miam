import { afterEach, beforeEach } from 'vitest';
import { vendorAccountsContract } from '@market-miam/testing';
import { FakeAuth0 } from '../../testing/fake-auth0';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0VendorAccounts } from './auth0-vendor-accounts';

let auth0: FakeAuth0;
let issuer: string;

beforeEach(async () => {
  auth0 = new FakeAuth0();
  issuer = await auth0.start();
});

afterEach(async () => {
  await auth0.stop();
});

vendorAccountsContract('Auth0VendorAccounts on FakeAuth0', (existing) => {
  auth0.users = existing.map(({ email, vendorId }) => ({
    connection: 'email',
    email,
    ...(vendorId && { app_metadata: { vendorId } }),
  }));
  return new Auth0VendorAccounts(new Auth0ManagementApi(issuer, 'management-client', 'management-secret'));
});
