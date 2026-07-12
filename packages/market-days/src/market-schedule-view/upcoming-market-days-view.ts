export type MarketDayOccurrence = {
  scheduleId: string;
  marketId: string;
  date: string;
  day: string;
  startTime?: string;
  endTime?: string;
  absent: boolean;
  market: {
    name: string;
    town: string;
    codePostal: string;
    streetAddress?: string;
    pitch?: string;
  };
};

export type UpcomingMarketDaysView = {
  marketDays: MarketDayOccurrence[];
};
