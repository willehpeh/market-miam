import { MAX_UPLOAD_EDGE, scaledSize } from './photo-downscale';

describe('scaledSize', () => {
  it('leaves a photo already within the cap at its own size', () => {
    expect(scaledSize(1600, 1200)).toEqual({ width: 1600, height: 1200 });
  });

  it('leaves a photo sitting exactly on the cap alone', () => {
    expect(scaledSize(MAX_UPLOAD_EDGE, 1000)).toEqual({ width: MAX_UPLOAD_EDGE, height: 1000 });
  });

  it('caps the long edge of a landscape photo, keeping its ratio', () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 2000, height: 1500 });
  });

  it('caps the long edge of a portrait photo, keeping its ratio', () => {
    expect(scaledSize(3000, 4000)).toEqual({ width: 1500, height: 2000 });
  });

  it('rounds to whole pixels rather than emitting a fractional canvas size', () => {
    expect(scaledSize(4032, 3021)).toEqual({ width: 2000, height: 1499 });
  });

  it('honours a cap given explicitly', () => {
    expect(scaledSize(4000, 2000, 1000)).toEqual({ width: 1000, height: 500 });
  });
});
