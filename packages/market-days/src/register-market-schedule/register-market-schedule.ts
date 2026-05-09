export type RegisterMarketSchedule = {
  vendorId: string;
  scheduleName: string;
  marketId: string;
  directionsToStall?: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
}
