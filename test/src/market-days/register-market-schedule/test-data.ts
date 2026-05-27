import { RegisterMarketSchedule } from '@market-monster/market-days';

export class TestRegisterMarketSchedule {
  static simple(): RegisterMarketSchedule {
    return new RegisterMarketSchedule({
      vendorId: 'vendor-id',
      scheduleId: 'schedule-id',
      scheduleName: 'Saturday Market',
      startDate: '2023-09-08',
      marketId: 'market-id',
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
    });
  }

  static simpleNoTimes(): RegisterMarketSchedule {
    return new RegisterMarketSchedule({
      vendorId: 'vendor-id',
      scheduleId: 'schedule-id',
      scheduleName: 'Saturday Market',
      startDate: '2023-09-08',
      marketId: 'market-id',
      days: [{ day: 'SAT' }],
    });
  }

  static simpleMonthly(): RegisterMarketSchedule {
    return new RegisterMarketSchedule({
      vendorId: 'vendor-id',
      scheduleId: 'schedule-id',
      scheduleName: 'Saturday Market',
      startDate: '2023-09-08',
      marketId: 'market-id',
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
      frequency: { weeks: 4 },
    });
  }

  static with(overrides: Partial<RegisterMarketSchedule>): RegisterMarketSchedule {
    const defaults = this.simple();
    return new RegisterMarketSchedule({
      vendorId: overrides.vendorId ?? defaults.vendorId,
      scheduleId: overrides.scheduleId ?? defaults.scheduleId,
      scheduleName: overrides.scheduleName ?? defaults.scheduleName,
      startDate: overrides.startDate ?? defaults.startDate,
      marketId: overrides.marketId ?? defaults.marketId,
      days: overrides.days ?? defaults.days,
      frequency: overrides.frequency ?? defaults.frequency,
    });
  }

  static everyDay(): RegisterMarketSchedule {
    return this.with({
      days: [
        { day: 'MON', startTime: '08:00', endTime: '14:00' },
        { day: 'TUE', startTime: '08:00', endTime: '14:00' },
        { day: 'WED', startTime: '08:00', endTime: '14:00' },
        { day: 'THU', startTime: '08:00', endTime: '14:00' },
        { day: 'FRI', startTime: '08:00', endTime: '14:00' },
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
        { day: 'SUN', startTime: '08:00', endTime: '14:00' },
      ]
    });
  }
}
