import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenVerifier, type VerifiedVendor } from '@market-miam/auth';
import { bearerTokenFrom } from './bearer-token';

export const VERIFIED_VENDOR = 'verifiedVendor';

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  verifiedVendor?: VerifiedVendor;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly tokens: TokenVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = bearerTokenFrom(request.headers.authorization);
    try {
      request[VERIFIED_VENDOR] = await this.tokens.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
