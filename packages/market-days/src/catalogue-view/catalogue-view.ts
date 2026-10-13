export type CatalogueViewItem = {
  itemId: string;
  name: string;
  description: string;
  price?: number;
  imageReference: string;
  variants?: { name: string; description: string; price: number }[];
  // Codes of the 14 (INCO 1169/2011 Annex II). Null is undeclared, which is not "none".
  allergens: string[] | null;
};

export type CatalogueView = {
  items: CatalogueViewItem[];
};
