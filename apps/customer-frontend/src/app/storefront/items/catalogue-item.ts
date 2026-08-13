export type CatalogueItem = {
  itemId: string;
  name: string;
  description: string;
  price?: number;
  imageReference: string;
  variants?: { name: string; description: string; price: number }[];
};
