import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorAccounts } from '@market-miam/market-days';
import { Accounts } from './accounts';
import { Auth0Accounts } from './auth0-accounts';
import { Auth0ManagementApi } from './auth0-management-api';
import { Auth0VendorAccounts } from './auth0-vendor-accounts';
import { Auth0Users } from './auth0-users';

// The identity provider outside development: the Auth0 tenant, through one Management API
// client, so the account list and the invitation processor share its metered token.
@Global()
@Module({
  providers: [
    {
      provide: Auth0ManagementApi,
      useFactory: (config: ConfigService) =>
        new Auth0ManagementApi(
          config.getOrThrow<string>('AUTH0_ISSUER'),
          config.getOrThrow<string>('AUTH0_MGMT_CLIENT_ID'),
          config.getOrThrow<string>('AUTH0_MGMT_CLIENT_SECRET'),
        ),
      inject: [ConfigService],
    },
    { provide: Auth0Users, useFactory: (api: Auth0ManagementApi) => new Auth0Users(api), inject: [Auth0ManagementApi] },
    { provide: Accounts, useFactory: (users: Auth0Users) => new Auth0Accounts(users), inject: [Auth0Users] },
    { provide: VendorAccounts, useFactory: (users: Auth0Users) => new Auth0VendorAccounts(users), inject: [Auth0Users] },
  ],
  exports: [Accounts, VendorAccounts],
})
export class Auth0AccountsModule {}
