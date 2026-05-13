export type ScheduleSnapshot = {
  scheduleId: string;
  scheduleName: string;
  days: { day: string; startTime?: string; endTime?: string }[];
  every: { weeks: number };
};
