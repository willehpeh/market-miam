import { UnauthorizedException } from '@nestjs/common';

export function bearerTokenFrom(authorization: string | undefined): string {
  const [scheme, token] = (authorization ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new UnauthorizedException();
  }
  return token;
}
