import { RegisterMarketSchedule } from '@market-monster/market-days';

export class TestRegisterMarketSchedule {
  static simple(): RegisterMarketSchedule {
    return {
      vendorId: 'vendor-id',
      scheduleName: 'Saturday Market',
      marketId: 'market-id',
      days: [
        { day: 'SAT', startTime: '08:00', endTime: '14:00' },
      ],
    };
  }

  static with(overrides: Partial<RegisterMarketSchedule>): RegisterMarketSchedule {
    return { ...this.simple(), ...overrides };
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
