import { Global, Module } from '@nestjs/common';
import { InMemoryVendorAccounts, VendorAccounts } from '@market-miam/market-days';
import { Accounts } from './accounts';
import { DevelopmentAccounts } from './development-accounts';

// Local development's identity provider, with no Auth0: the one account the dev sign-in
// uses, and vendors' accounts kept in memory.
@Global()
@Module({
  providers: [
    { provide: Accounts, useClass: DevelopmentAccounts },
    { provide: VendorAccounts, useFactory: () => new InMemoryVendorAccounts() },
  ],
  exports: [Accounts, VendorAccounts],
})
export class DevelopmentAccountsModule {}
