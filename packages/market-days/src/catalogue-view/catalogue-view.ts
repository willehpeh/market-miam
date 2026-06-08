export type CatalogueViewItem = {
  itemId: string;
  name: string;
  description: string;
  price: number;
  photoUrl: string;
};

export type CatalogueView = {
  items: CatalogueViewItem[];
};
