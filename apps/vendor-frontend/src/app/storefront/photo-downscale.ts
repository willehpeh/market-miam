import { Observable } from 'rxjs';
import { PHOTO_UPLOAD_MAX_EDGE } from '@market-miam/common';

// Refused before we even try to decode: createImageBitmap has to materialise the whole
// bitmap in memory, and a 50 Mo source will take a low-end phone down with it.
export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;

// The ceiling Cloudinary accepts. Only reachable when a photo could not be decoded and
// rode through untouched — anything we re-encode lands an order of magnitude below it.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const UPLOAD_JPEG_QUALITY = 0.82;

// Below this a photo is already cheap to send, and re-encoding it would only cost a
// generation of JPEG quality.
export const PASSTHROUGH_BYTES = 1024 * 1024;

export function scaledSize(width: number, height: number, cap = PHOTO_UPLOAD_MAX_EDGE): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= cap) {
    return { width, height };
  }
  const ratio = cap / longest;
  return { width: Math.round(width * ratio), height: Math.round(height * ratio) };
}

/**
 * Shrinks a photo before it goes over the wire. Never fails: a photo it cannot decode
 * (an iPhone HEIC on a browser that doesn't read HEIC, say) comes back untouched, which
 * is why the caller still has to check the size of what it gets.
 */
export abstract class PhotoDownscale {
  abstract shrink(file: File): Observable<File>;
}
