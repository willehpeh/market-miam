import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { VendorAccounts } from '@market-miam/market-days';
import { FakeAuth0 } from '../../testing/fake-auth0';
import { Accounts } from './accounts';
import { Auth0AccountsModule } from './auth0-accounts.module';

describe('Auth0AccountsModule', () => {
  let auth0: FakeAuth0;
  let issuer: string;

  beforeEach(async () => {
    auth0 = new FakeAuth0();
    issuer = await auth0.start();
  });

  afterEach(async () => {
    await auth0.stop();
  });

  const compile = () =>
    Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          skipProcessEnv: true,
          load: [
            () => ({
              AUTH0_ISSUER: issuer,
              AUTH0_MGMT_CLIENT_ID: 'management-client',
              AUTH0_MGMT_CLIENT_SECRET: 'management-secret',
            }),
          ],
        }),
        Auth0AccountsModule,
      ],
    }).compile();

  // Auth0 meters Management tokens, so the account list and the invitation processor share one.
  it('lists accounts and opens a vendor account on one Management token', async () => {
    const app = await compile();

    await app.get(Accounts).all();
    await app.get(VendorAccounts).openFor({ vendorId: 'vendor-id', email: 'marie@example.com' });

    expect(auth0.tokenRequests).toHaveLength(1);
    expect(auth0.users).toEqual([
      { connection: 'email', email: 'marie@example.com', app_metadata: { vendorId: 'vendor-id' } },
    ]);
  });
});
