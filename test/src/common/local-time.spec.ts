import { EmptyValueError, LocalTime } from '@market-monster/common';

describe('LocalTime', () => {
  it.each([
    '00:00',
    '09:30',
    '12:00',
    '23:59',
  ])('should accept a valid HH:mm time: "%s"', (value) => {
    const time = new LocalTime(value);
    expect(time.value()).toBe(value);
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty value: "%s"', (value) => {
    expect(() => new LocalTime(value)).toThrow(EmptyValueError);
  });

  it.each([
    '9:30',
    '12:5',
    '1230',
    '12-30',
    '12:00:00',
    'not-a-time',
    '24:00',
    '23:60',
    '12:00 PM',
  ])('should reject an invalid time format: "%s"', (value) => {
    expect(() => new LocalTime(value)).toThrow();
  });
});
