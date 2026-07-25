export type CatalogueViewItem = {
  itemId: string;
  name: string;
  description: string;
  price?: number;
  imageReference: string;
  variants?: { name: string; description: string; price: number }[];
};

export type CatalogueView = {
  items: CatalogueViewItem[];
};
