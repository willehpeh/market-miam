import { Observable } from 'rxjs';

// Refused before we even try to decode: createImageBitmap has to materialise the whole
// bitmap in memory, and a 50 Mo source will take a low-end phone down with it.
export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;

// The ceiling Cloudinary accepts. Only reachable when a photo could not be decoded and
// rode through untouched — anything we re-encode lands an order of magnitude below it.
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Longest edge we upload. Mirrors the incoming `c_limit,w_2000` transformation the API
// signs (cloudinary-signed-uploads.ts) so Cloudinary never has to resize again, and still
// leaves headroom over the largest rendition anyone renders — c_fill,w_1200,h_900, the
// customer dish sheet.
export const MAX_UPLOAD_EDGE = 2000;

export const UPLOAD_JPEG_QUALITY = 0.82;

// Below this a photo is already cheap to send, and re-encoding it would only cost a
// generation of JPEG quality.
export const PASSTHROUGH_BYTES = 1024 * 1024;

export function scaledSize(width: number, height: number, cap = MAX_UPLOAD_EDGE): { width: number; height: number } {
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
