export type CatalogueViewItem = {
  itemId: string;
  name: string;
  description: string;
  price: number;
  imageReference: string;
};

export type CatalogueView = {
  items: CatalogueViewItem[];
};
