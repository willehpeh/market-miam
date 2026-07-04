import { createHash } from 'node:crypto';

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
