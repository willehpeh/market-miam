import { describe, expect, it } from 'vitest';
import { DateClock, Instant, LocalDate } from '@market-monster/common';

// The production Clock adapter (market-days wires it in prod; tests use a fixed
// clock). Reading through it proves it builds well-formed value objects from the
// system clock — a malformed instant/date would throw in their constructors.
describe('DateClock', () => {
  const clock = new DateClock();

  it("reads today's date from the system clock", () => {
    expect(clock.today().value()).toBe(LocalDate.today().value());
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
