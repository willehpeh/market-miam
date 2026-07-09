import { InMemoryCatalogueViews } from '@market-miam/market-days';
import { catalogueViewsContract } from '../catalogue-views.contract';

catalogueViewsContract('InMemoryCatalogueViews', () => new InMemoryCatalogueViews());
