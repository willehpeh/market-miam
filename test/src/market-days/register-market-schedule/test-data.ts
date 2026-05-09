import { RegisterMarketSchedule } from '@market-monster/market-days';

export class TestRegisterMarketSchedule {
  static valid(): RegisterMarketSchedule {
    return {
      vendorId: 'vendor-id',
      scheduleName: 'Saturday Market',
      marketId: 'market-id',
      directionsToStall: 'Third row, near the entrance',
      days: [
        { day: 'Saturday', startTime: '08:00', endTime: '14:00' },
      ],
    };
  }

  static with(overrides: Partial<RegisterMarketSchedule>): RegisterMarketSchedule {
    return { ...this.valid(), ...overrides };
  }
}
