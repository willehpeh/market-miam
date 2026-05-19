import { RegisterMarketSchedule } from '@market-monster/market-days';

export class TestRegisterMarketSchedule {
  static simple(): RegisterMarketSchedule {
    return new RegisterMarketSchedule(
      'vendor-id',
      'schedule-id',
      'Saturday Market',
      'market-id',
      [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
    );
  }

  static with(overrides: Partial<RegisterMarketSchedule>): RegisterMarketSchedule {
    const defaults = this.simple();
    return new RegisterMarketSchedule(
      overrides.vendorId ?? defaults.vendorId,
      overrides.scheduleId ?? defaults.scheduleId,
      overrides.scheduleName ?? defaults.scheduleName,
      overrides.marketId ?? defaults.marketId,
      overrides.days ?? defaults.days,
      overrides.every ?? defaults.every,
    );
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
