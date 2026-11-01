import { ConfigService } from '@nestjs/config';
import {
  Auth0OperatorTokenVerifier,
  DevelopmentOperatorTokenVerifier,
  OperatorTokenVerifier,
} from '@market-miam/auth';

// The operator API shares the vendor API's Auth0 tenant (AUTH0_ISSUER) but has its own
// audience, so a vendor's token is never an operator's.
export function operatorTokenVerifierFor(config: ConfigService): OperatorTokenVerifier {
  if (config.get('NODE_ENV') === 'development') {
    return new DevelopmentOperatorTokenVerifier();
  }
  return new Auth0OperatorTokenVerifier(
    config.getOrThrow<string>('AUTH0_ISSUER'),
    config.getOrThrow<string>('AUTH0_OPS_AUDIENCE'),
  );
}
