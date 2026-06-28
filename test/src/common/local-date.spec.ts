import { EmptyValueError, LocalDate } from '@market-monster/common';

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
});
