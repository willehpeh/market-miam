import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DateClock, Instant } from '@market-monster/common';

describe('DateClock', () => {
  const clock = new DateClock();

  describe('today', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('reads the calendar date in local time, not UTC', () => {
      vi.setSystemTime(new Date('2026-06-24T02:00:00.000Z'));

      expect(clock.today().value()).toBe('2026-06-23');
    });

    it('zero-pads single-digit months and days', () => {
      vi.setSystemTime(new Date('2026-05-09T13:00:00.000Z'));

      expect(clock.today().value()).toBe('2026-05-09');
    });
  });

  it('reads the current instant from the system clock', () => {
    const before = Date.now();
    const instant = clock.now();
    const after = Date.now();

    expect(instant).toBeInstanceOf(Instant);
    const millis = new Date(instant.value()).getTime();
    expect(millis).toBeGreaterThanOrEqual(before);
    expect(millis).toBeLessThanOrEqual(after);
  });
});
