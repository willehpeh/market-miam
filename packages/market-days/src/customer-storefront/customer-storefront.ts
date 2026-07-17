import { CatalogueViewItem } from '../catalogue-view/catalogue-view';

export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
      dishes: CatalogueViewItem[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
