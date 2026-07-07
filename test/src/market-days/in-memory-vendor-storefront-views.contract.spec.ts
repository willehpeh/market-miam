import { vendorStorefrontViewsContract } from './vendor-storefront-views.contract';
import { InMemoryVendorStorefrontViews } from '@market-miam/market-days';

vendorStorefrontViewsContract('InMemoryVendorStorefrontViews', () => new InMemoryVendorStorefrontViews());
