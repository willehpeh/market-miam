import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TokenVerifier, VerifiedVendor } from '@market-monster/auth';

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
    const token = this.bearerToken(request);
    try {
      request[VERIFIED_VENDOR] = await this.tokens.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  private bearerToken(request: AuthenticatedRequest): string {
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException();
    }
    return token;
  }
}
