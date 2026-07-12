export type MarketScheduleView = {
  scheduleId: string;
  market: {
    id: string;
    name: string;
    streetAddress?: string;
    codePostal: string;
    town: string;
    pitch?: string;
  };
  startDate: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency: { weeks: number } | 'once';
  absences?: { from: string; to: string }[];
};

export type MarketSchedulesView = {
  schedules: MarketScheduleView[];
};
