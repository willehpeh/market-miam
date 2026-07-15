import { createHash } from 'node:crypto';

/**
 * Lets the browser upload straight to Cloudinary without ever holding the secret:
 * Cloudinary recomputes this hash with its own copy and rejects a mismatch, so the
 * signed params can't be tampered with in transit. Key order must match Cloudinary's,
 * hence the sort.
 */
export function cloudinarySignature(
  params: Record<string, string | number | boolean>,
  apiSecret: string,
): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}
