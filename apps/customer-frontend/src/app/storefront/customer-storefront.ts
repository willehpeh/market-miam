export type CatalogueDish = {
  itemId: string;
  name: string;
  description: string;
  price: number;
  imageReference: string;
};

export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
      dishes: CatalogueDish[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
