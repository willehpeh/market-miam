import { CloudinaryUrlPipe } from './cloudinary-url.pipe';

describe('CloudinaryUrlPipe', () => {
  const pipe = new CloudinaryUrlPipe();

  it('returns an empty string for a missing public id', () => {
    expect(pipe.transform('', 'c_fill,w_100,h_100')).toBe('');
  });

  it('builds a Cloudinary delivery URL from the transform and public id', () => {
    expect(pipe.transform('storefronts/acme/cover-photo', 'c_fill,w_1200,h_600')).toBe(
      'https://res.cloudinary.com/test-cloud/image/upload/c_fill,w_1200,h_600/storefronts/acme/cover-photo',
    );
  });
});
