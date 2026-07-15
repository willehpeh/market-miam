import { ConfigService } from '@nestjs/config';
import { Auth0TokenVerifier, StaticTokenVerifier, TokenVerifier } from '@market-miam/auth';

function developmentMode(config: ConfigService) {
  return config.get('NODE_ENV') === 'development';
}

function auth0Verifier(config: ConfigService<Record<string | symbol, unknown>, false>) {
  return new Auth0TokenVerifier(
    config.getOrThrow<string>('AUTH0_ISSUER'),
    config.getOrThrow<string>('AUTH0_AUDIENCE')
  );
}

export function tokenVerifierFor(config: ConfigService): TokenVerifier {
  return developmentMode(config) ? StaticTokenVerifier.forDevelopment(config) : auth0Verifier(config);
}
