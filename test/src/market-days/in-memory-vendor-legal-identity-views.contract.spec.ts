import { vendorLegalIdentityViewsContract } from './vendor-legal-identity-views.contract';
import { InMemoryVendorLegalIdentityViews } from '@market-miam/market-days';

vendorLegalIdentityViewsContract('InMemoryVendorLegalIdentityViews', () => new InMemoryVendorLegalIdentityViews());
