import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { VerifiedVendor } from '@market-monster/auth';
import { AuthenticatedRequest, VERIFIED_VENDOR } from './jwt-auth.guard';

export function currentVendor(
  _data: unknown,
  context: ExecutionContext,
): VerifiedVendor | undefined {
  return context.switchToHttp().getRequest<AuthenticatedRequest>()[VERIFIED_VENDOR];
}

export const CurrentVendor = createParamDecorator(currentVendor);
