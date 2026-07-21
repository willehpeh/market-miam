import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersController } from './users/users.controller';
import { Auth0Users } from './auth0/auth0-users';
import { ManagementApiAuth0Users } from './auth0/management-api-auth0-users';
import { Subdomains } from './subdomains/subdomains';
import { PostgresSubdomains } from './subdomains/postgres-subdomains';

@Module({
  imports: [],
  controllers: [AppController, UsersController],
  providers: [
    AppService,
    { provide: Auth0Users, useClass: ManagementApiAuth0Users },
    { provide: Subdomains, useClass: PostgresSubdomains },
  ],
})
export class AppModule {}
