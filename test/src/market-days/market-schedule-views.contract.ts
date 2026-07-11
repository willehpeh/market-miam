import { beforeEach, describe, expect, it } from 'vitest';
import { MarketScheduleView, MarketScheduleViews, MarketScheduleViewStore } from '@market-miam/market-days';

type Store = MarketScheduleViews & MarketScheduleViewStore;

const schedule = (overrides: Partial<MarketScheduleView> = {}): MarketScheduleView => ({
  scheduleId: 'schedule-1',
  market: { id: 'market-1', name: 'Marché de Belleville', streetAddress: 'Boulevard de Belleville', codePostal: '75011', town: 'Paris', pitch: 'B12' },
  startDate: '2026-07-15',
  days: [{ day: 'TUE', startTime: '07:00', endTime: '14:30' }],
  frequency: { weeks: 1 },
  ...overrides,
});

export function marketScheduleViewsContract(name: string, create: () => Store): void {
  describe(`MarketScheduleViews contract: ${name}`, () => {
    let store: Store;

    beforeEach(() => {
      store = create();
    });

    it('has no schedules for an unknown vendor', async () => {
      expect(await store.forVendor('nobody')).toEqual({ schedules: [] });
    });

    it('records a schedule', async () => {
      await store.recordSchedule(schedule(), 'v1');
      expect(await store.forVendor('v1')).toEqual({ schedules: [schedule()] });
    });

    it('keeps schedules in the order they were recorded', async () => {
      await store.recordSchedule(schedule({ scheduleId: 'a' }), 'v1');
      await store.recordSchedule(schedule({ scheduleId: 'b' }), 'v1');
      expect((await store.forVendor('v1')).schedules.map(s => s.scheduleId)).toEqual(['a', 'b']);
    });

    it('replaces a re-recorded schedule in place', async () => {
      await store.recordSchedule(schedule({ scheduleId: 'a' }), 'v1');
      await store.recordSchedule(schedule({ scheduleId: 'b' }), 'v1');
      await store.recordSchedule(schedule({ scheduleId: 'a', days: [{ day: 'WED' }] }), 'v1');

      const { schedules } = await store.forVendor('v1');
      expect(schedules.map(s => s.scheduleId)).toEqual(['a', 'b']);
      expect(schedules[0].days).toEqual([{ day: 'WED' }]);
    });

    it('preserves a schedule with optional fields omitted', async () => {
      const lean = schedule({ market: { id: 'm', name: 'N', codePostal: '75001', town: 'Paris' }, days: [{ day: 'MON' }] });
      await store.recordSchedule(lean, 'v1');
      expect(await store.forVendor('v1')).toEqual({ schedules: [lean] });
    });

    it('scopes schedules to their vendor', async () => {
      await store.recordSchedule(schedule({ scheduleId: 'a' }), 'v1');
      expect(await store.forVendor('v2')).toEqual({ schedules: [] });
    });

    it('clears all schedules', async () => {
      await store.recordSchedule(schedule(), 'v1');
      await store.clear();
      expect(await store.forVendor('v1')).toEqual({ schedules: [] });
    });
  });
}
