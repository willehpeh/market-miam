import { describe, expect, it } from 'vitest';
import { Clock, Instant, LocalDate } from '@market-miam/common';
import { cloudinarySignature } from './cloudinary-signature';
import { CloudinarySignedUploads } from './cloudinary-signed-uploads';

const fixedClock: Clock = {
  today: () => new LocalDate('2026-06-23'),
  now: () => new Instant('2026-06-23T09:00:00.000Z'),
};

describe('CloudinarySignedUploads', () => {
  const signedUploads = new CloudinarySignedUploads('demo-cloud', 'a-key', 'a-secret', fixedClock);

  it('scopes the upload to the given public id and exposes the cloud name and key', () => {
    const signed = signedUploads.for('storefronts/acme-bakery/cover-photo');
    expect(signed.cloudName).toBe('demo-cloud');
    expect(signed.apiKey).toBe('a-key');
    expect(signed.params.public_id).toBe('storefronts/acme-bakery/cover-photo');
  });

  it('eagerly generates the display rendition so it exists before the storefront requests it', () => {
    const signed = signedUploads.for('storefronts/acme-bakery/cover-photo');
    expect(signed.params.eager).toBe('c_fill,w_1200,h_600,q_auto,f_webp');
  });

  it('signs exactly the params it returns, so the browser upload verifies', () => {
    const signed = signedUploads.for('storefronts/acme-bakery/cover-photo');
    expect(signed.signature).toBe(cloudinarySignature({ ...signed.params }, 'a-secret'));
  });
});
