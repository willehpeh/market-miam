import { EmptyValueError, LocalDate } from '@market-miam/common';

describe('LocalDate', () => {
  it.each([
    '2026-01-01',
    '2026-12-31',
    '2000-06-15',
  ])('should accept a valid YYYY-MM-DD date: "%s"', (value) => {
    const date = new LocalDate(value);
    expect(date.value()).toBe(value);
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty value: "%s"', (value) => {
    expect(() => new LocalDate(value)).toThrow(EmptyValueError);
  });

  it.each([
    '01-01-2026',
    '2026/01/01',
    '2026-1-1',
    '20260101',
    'not-a-date',
    '2026-13-01',
    '2026-01-32',
  ])('should reject an invalid date format: "%s"', (value) => {
    expect(() => new LocalDate(value)).toThrow();
  });

  describe('dayOfWeek', () => {
    it.each([
      ['2024-01-01', 'MON'],
      ['2024-01-02', 'TUE'],
      ['2024-01-03', 'WED'],
      ['2024-01-04', 'THU'],
      ['2024-01-05', 'FRI'],
      ['2024-01-06', 'SAT'],
      ['2024-01-07', 'SUN'],
    ])('%s falls on %s', (value, day) => {
      expect(new LocalDate(value).dayOfWeek()).toBe(day);
    });
  });

  describe('plusDays', () => {
    it.each([
      ['2024-01-01', 0, '2024-01-01'],
      ['2024-01-01', 1, '2024-01-02'],
      ['2024-01-31', 1, '2024-02-01'],
      ['2024-12-31', 1, '2025-01-01'],
      ['2024-02-28', 1, '2024-02-29'],
      ['2024-01-01', -1, '2023-12-31'],
      ['2024-01-01', 56, '2024-02-26'],
    ])('%s plus %d days is %s', (value, days, expected) => {
      expect(new LocalDate(value).plusDays(days).value()).toBe(expected);
    });
  });
});
