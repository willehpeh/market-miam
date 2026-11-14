import { describe, expect, it } from 'vitest';
import {
  Clock,
  COVER_PHOTO_PREVIEW_TRANSFORMATION,
  Instant,
  ITEM_PHOTO_PREVIEW_TRANSFORMATION,
  ITEM_PHOTO_THUMBNAIL_TRANSFORMATION,
  LocalDate,
} from '@market-miam/common';
import { cloudinarySignature } from './cloudinary-signature';
import { CloudinarySignedUploads } from './cloudinary-signed-uploads';

const fixedClock: Clock = {
  today: () => new LocalDate('2026-06-23'),
  now: () => new Instant('2026-06-23T09:00:00.000Z'),
};

describe('CloudinarySignedUploads', () => {
  const signedUploads = new CloudinarySignedUploads('demo-cloud', 'a-key', 'a-secret', fixedClock);

  it('scopes the upload to the given public id and exposes the cloud name and key', () => {
    const signed = signedUploads.forCoverPhoto('storefronts/acme-bakery/cover-photo');
    expect(signed.cloudName).toBe('demo-cloud');
    expect(signed.apiKey).toBe('a-key');
    expect(signed.params.public_id).toBe('storefronts/acme-bakery/cover-photo');
  });

  it('files the photo under the folders its public id names, not the home folder', () => {
    const signed = signedUploads.forCoverPhoto('storefronts/acme-bakery/cover-photo');
    expect(signed.params.asset_folder).toBe('storefronts/acme-bakery');
  });

  it('generates the cover preview during the upload, so the vendor sees it without waiting on Cloudinary', () => {
    const signed = signedUploads.forCoverPhoto('storefronts/acme-bakery/cover-photo');
    expect(signed.params.eager).toBe(COVER_PHOTO_PREVIEW_TRANSFORMATION);
  });

  it('generates both the item preview and the list thumbnail during the upload, separated by a pipe', () => {
    const signed = signedUploads.forItemPhoto('vendors/acme-bakery/dishes/coq-au-vin');
    expect(signed.params.eager).toBe(`${ITEM_PHOTO_PREVIEW_TRANSFORMATION}|${ITEM_PHOTO_THUMBNAIL_TRANSFORMATION}`);
  });

  it('signs exactly the params it returns, so the browser upload verifies', () => {
    const signed = signedUploads.forItemPhoto('vendors/acme-bakery/dishes/coq-au-vin');
    expect(signed.signature).toBe(cloudinarySignature({ ...signed.params }, 'a-secret'));
  });
});
