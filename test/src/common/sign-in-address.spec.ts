import { InvalidEmailError, SignInAddress } from '@market-miam/common';

// Auth0 keeps the addresses accounts sign in with in lower case, and compares them regardless of case.
describe('SignInAddress', () => {
  it('keeps the address in lower case', () => {
    expect(new SignInAddress('Marie@Example.COM').value()).toBe('marie@example.com');
  });

  it('equals the same address typed in another case', () => {
    expect(new SignInAddress('Marie@Example.com').equals(new SignInAddress('marie@EXAMPLE.com'))).toBe(true);
  });

  it('differs from another address', () => {
    expect(new SignInAddress('marie@example.com').equals(new SignInAddress('paul@example.com'))).toBe(false);
  });

  it('refuses what Email refuses', () => {
    expect(() => new SignInAddress('marie@example')).toThrow(InvalidEmailError);
  });
});
