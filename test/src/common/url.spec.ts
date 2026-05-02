import { Url } from '@market-monster/common';

describe('Url', () => {

  it('should create a Url', () => {
    const url = new Url('https://example.com/photo.jpg');
    expect(url.value()).toBe('https://example.com/photo.jpg');
  });

  it('should be equal to identical Url', () => {
    const url1 = new Url('https://example.com/photo.jpg');
    const url2 = new Url('https://example.com/photo.jpg');
    expect(url1.equals(url2)).toBe(true);
  });

  it('should not be equal to different Url', () => {
    const url1 = new Url('https://example.com/photo1.jpg');
    const url2 = new Url('https://example.com/photo2.jpg');
    expect(url1.equals(url2)).toBe(false);
  });

  it.each([
    '',
    'not-a-url',
    'ftp://example.com/file.txt',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:someone@example.com',
    '   ',
  ])('should not allow invalid URL: %s', (value) => {
    expect(() => new Url(value)).toThrow();
  });
});
