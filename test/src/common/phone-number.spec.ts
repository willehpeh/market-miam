import { PhoneNumber } from '@market-miam/common';

describe('PhoneNumber', () => {
  it('keeps a provided phone number', () => {
    expect(new PhoneNumber('+44 7700 900000').value()).toBe('+44 7700 900000');
  });

  it('allows an empty phone number', () => {
    expect(new PhoneNumber('').value()).toBe('');
  });

  it('trims surrounding whitespace', () => {
    expect(new PhoneNumber('  01234 567890  ').value()).toBe('01234 567890');
  });
});
