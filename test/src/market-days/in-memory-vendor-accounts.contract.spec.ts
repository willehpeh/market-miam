import { vendorAccountsContract } from './vendor-accounts.contract';
import { InMemoryVendorAccounts } from '@market-miam/market-days';

vendorAccountsContract('InMemoryVendorAccounts', () => new InMemoryVendorAccounts());
