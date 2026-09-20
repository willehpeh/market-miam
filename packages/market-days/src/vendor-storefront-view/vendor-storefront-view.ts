export type VendorStorefrontView = {
  name: string;
  description: string;
  phone: string;
  imageReference: string;
  published: boolean;
  // Opted in: a storefront that has never chosen quotes its prices.
  cartePricesVisible: boolean;
};
