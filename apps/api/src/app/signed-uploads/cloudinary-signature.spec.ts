import { describe, expect, it } from 'vitest';
import { cloudinarySignature } from './cloudinary-signature';

describe('cloudinarySignature', () => {
  it('is the SHA-1 of the alphabetically sorted params with the api secret appended', () => {
    const signature = cloudinarySignature(
      { public_id: 'sample_image', timestamp: 1315060510 },
      'abcd',
    );
    expect(signature).toBe('b4ad47fb4e25c7bf5f92a20089f9db59bc302313');
  });

  it('sorts params so insertion order does not change the signature', () => {
    const inOrder = cloudinarySignature({ public_id: 'sample_image', timestamp: 1315060510 }, 'abcd');
    const reversed = cloudinarySignature({ timestamp: 1315060510, public_id: 'sample_image' }, 'abcd');
    expect(reversed).toBe(inOrder);
  });
});
