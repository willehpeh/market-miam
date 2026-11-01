import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { VerifiedOperator } from '@market-miam/auth';
import { OperatorRequest, VERIFIED_OPERATOR } from './operator-auth.guard';

export function currentOperator(
  _data: unknown,
  context: ExecutionContext,
): VerifiedOperator | undefined {
  return context.switchToHttp().getRequest<OperatorRequest>()[VERIFIED_OPERATOR];
}

export const CurrentOperator = createParamDecorator(currentOperator);
