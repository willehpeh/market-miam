import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module';
import { Auth0Account, Auth0Users } from '../auth0/auth0-users';
import { Subdomains } from '../subdomains/subdomains';
import { FakeAuth0Users } from './fake-auth0-users';
import { FakeSubdomains } from './fake-subdomains';

export async function bootAdminTestApp(
  accounts: Auth0Account[] = [],
  subdomains: Array<[string, string]> = [],
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(Auth0Users)
    .useValue(new FakeAuth0Users(accounts))
    .overrideProvider(Subdomains)
    .useValue(new FakeSubdomains(subdomains))
    .compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  return app;
}
