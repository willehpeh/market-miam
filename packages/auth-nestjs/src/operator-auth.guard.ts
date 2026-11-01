import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { NotAnOperatorError, OperatorTokenVerifier, type VerifiedOperator } from '@market-miam/auth';
import { bearerTokenFrom } from './bearer-token';

export const VERIFIED_OPERATOR = 'verifiedOperator';

export interface OperatorRequest {
  headers: { authorization?: string };
  verifiedOperator?: VerifiedOperator;
}

// Put it on the controller class, never on single routes: a route added later to an
// operator controller is then guarded without anyone remembering to.
@Injectable()
export class OperatorAuthGuard implements CanActivate {
  constructor(private readonly operators: OperatorTokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<OperatorRequest>();
    const token = bearerTokenFrom(request.headers.authorization);
    try {
      request[VERIFIED_OPERATOR] = await this.operators.verify(token);
      return true;
    } catch (error) {
      if (error instanceof NotAnOperatorError) {
        throw new ForbiddenException();
      }
      throw new UnauthorizedException();
    }
  }
}
