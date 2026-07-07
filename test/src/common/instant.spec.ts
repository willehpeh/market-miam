import { Instant, InvalidInstantError } from '@market-miam/common';

describe('Instant', () => {
  it('should create with a valid ISO string', () => {
    const validInstantString = '2026-06-13T20:33:19.632Z';
    const instant = new Instant(validInstantString);

    expect(instant.value()).toBe(validInstantString);
  });

  it('should create with a valid ISO string on a leap day', () => {
    const leapDayInstantString = '2024-02-29T20:33:19.632Z';
    const instant = new Instant(leapDayInstantString);

    expect(instant.value()).toBe(leapDayInstantString);
  });

  it.each([
    ['no trailing Z', '2026-06-13T20:33:19.632'],
    ['no milliseconds', '2026-06-13T20:33:19Z'],
    ['a space instead of T', '2026-06-13 20:33:19.632Z'],
    ['slash date separators', '2026/06/13T20:33:19.632Z'],
    ['a missing time component', '2026-06-13Z'],
    ['too few millisecond digits', '2026-06-13T20:33:19.63Z'],
    ['trailing characters', '2026-06-13T20:33:19.632Z '],
    ['a non-date string', 'not-a-date'],
    ['an empty string', ''],
  ])('should fail with an ISO string with %s', (_, invalidInstantString) => {
    expect(() => new Instant(invalidInstantString)).toThrow(InvalidInstantError);
  });

  it.each([
    ['a zero month', '2026-00-13T20:33:19.632Z'],
    ['a month past December', '2026-13-13T20:33:19.632Z'],
    ['a zero day', '2026-06-00T20:33:19.632Z'],
    ['a day past the end of the month', '2026-06-31T20:33:19.632Z'],
    ['a non-existent leap day', '2025-02-29T20:33:19.632Z'],
    ['a day past the end of February', '2026-02-30T20:33:19.632Z'],
    ['an hour past 23', '2026-06-13T24:33:19.632Z'],
    ['a minute past 59', '2026-06-13T20:60:19.632Z'],
    ['a second past 59', '2026-06-13T20:33:60.632Z'],
  ])('should fail with a well-formed but impossible date-time with %s', (_, invalidInstantString) => {
    expect(() => new Instant(invalidInstantString)).toThrow(InvalidInstantError);
  });
});
