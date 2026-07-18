export type CatalogueDish = {
  itemId: string;
  name: string;
  description: string;
  price: number;
  imageReference: string;
};

export type UpcomingMarket = {
  date: string;
  weekday: string;
  marketName: string;
  startTime?: string;
  endTime?: string;
  street?: string;
  postalCode: string;
  town: string;
  pitch?: string;
  cancelled: boolean;
};

export type CustomerStorefront =
  | {
      status: 'published';
      name: string;
      description: string;
      phone: string;
      coverPhoto: string | null;
      dishes: CatalogueDish[];
      upcomingMarkets: UpcomingMarket[];
    }
  | {
      status: 'coming-soon';
      name: string | null;
    };
