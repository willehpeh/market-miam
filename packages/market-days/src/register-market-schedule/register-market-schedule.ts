export type RegisterMarketSchedule = {
  vendorId: string;
  scheduleName: string;
  marketId: string;
  days: {
    day: string;
    startTime?: string;
    endTime?: string;
  }[];
  every?: {
    weeks?: number;
  }
}
