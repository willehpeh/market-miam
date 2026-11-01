import { ConfigService } from '@nestjs/config';
import { Accounts } from './accounts';
import { Auth0Accounts } from './auth0-accounts';
import { DevelopmentAccounts } from './development-accounts';

export function accountsFor(config: ConfigService): Accounts {
  if (config.get('NODE_ENV') === 'development') {
    return new DevelopmentAccounts();
  }
  return new Auth0Accounts(
    config.getOrThrow<string>('AUTH0_ISSUER'),
    config.getOrThrow<string>('AUTH0_MGMT_CLIENT_ID'),
    config.getOrThrow<string>('AUTH0_MGMT_CLIENT_SECRET'),
  );
}
