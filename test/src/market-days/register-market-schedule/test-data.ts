import { RegisterMarketSchedule } from '@market-miam/market-days';

const market = () => ({
  id: 'market-id',
  name: 'Belleville Market',
  streetAddress: '20 rue du Marché',
  codePostal: '75020',
  town: 'Paris',
  pitch: 'Stall 42',
});

export class TestRegisterMarketSchedule {
  static simple(): RegisterMarketSchedule {
    return new RegisterMarketSchedule({
      vendorId: 'vendor-id',
      scheduleId: 'schedule-id',
      startDate: '2023-09-08',
      market: market(),
      days: [{ day: 'SAT', startTime: '08:00', endTime: '14:00' }],
    });
  }

  static simpleNoTimes(): RegisterMarketSchedule {
    return this.with({ days: [{ day: 'SAT' }] });
  }

  static simpleMonthly(): RegisterMarketSchedule {
    return this.with({ frequency: { weeks: 4 } });
  }

  static with(overrides: Partial<RegisterMarketSchedule>): RegisterMarketSchedule {
    const defaults = this.simple();
    return new RegisterMarketSchedule({
      vendorId: overrides.vendorId ?? defaults.vendorId,
      scheduleId: overrides.scheduleId ?? defaults.scheduleId,
      startDate: overrides.startDate ?? defaults.startDate,
      market: overrides.market ?? defaults.market,
      days: overrides.days ?? defaults.days,
      frequency: overrides.frequency ?? defaults.frequency,
    });
  }

  static withMarket(overrides: Partial<RegisterMarketSchedule['market']>): RegisterMarketSchedule {
    return this.with({ market: { ...market(), ...overrides } });
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
