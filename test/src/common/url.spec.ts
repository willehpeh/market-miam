import { EmptyValueError, Url } from '@market-miam/common';

describe('Url', () => {
  it.each([
    'https://example.com',
    'https://example.com/path/to/resource',
    'http://localhost:3000',
  ])('should accept a valid URL: "%s"', (value) => {
    const url = new Url(value);
    expect(url.value()).toBe(value);
  });

  it.each([
    '',
    '   ',
  ])('should reject an empty value: "%s"', (value) => {
    expect(() => new Url(value)).toThrow(EmptyValueError);
  });

  it.each([
    'javascript:alert(1)',
    'javascript:void(0)',
    'data:text/html,<script>alert(1)</script>',
  ])('should reject a dangerous URL scheme: "%s"', (value) => {
    expect(() => new Url(value)).toThrow();
  });

  it.each([
    'not-a-url',
    'ftp://example.com',
    '://missing-scheme',
  ])('should reject an invalid or unsupported URL: "%s"', (value) => {
    expect(() => new Url(value)).toThrow();
  });
});
