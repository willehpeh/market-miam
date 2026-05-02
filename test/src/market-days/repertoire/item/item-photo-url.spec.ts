import { ItemPhotoUrl } from '@market-monster/market-days';

describe('ItemPhotoUrl', () => {

  it('should create an ItemPhotoUrl', () => {
    const url = new ItemPhotoUrl('https://example.com/photo.jpg');
    expect(url.value()).toBe('https://example.com/photo.jpg');
  });

  it('should be equal to identical ItemPhotoUrl', () => {
    const url1 = new ItemPhotoUrl('https://example.com/photo.jpg');
    const url2 = new ItemPhotoUrl('https://example.com/photo.jpg');
    expect(url1.equals(url2)).toBe(true);
  });

  it('should not be equal to different ItemPhotoUrl', () => {
    const url1 = new ItemPhotoUrl('https://example.com/photo1.jpg');
    const url2 = new ItemPhotoUrl('https://example.com/photo2.jpg');
    expect(url1.equals(url2)).toBe(false);
  });
});
