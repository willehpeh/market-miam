import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OperatorTokenVerifier, TokenVerifier } from '@market-miam/auth';
import { Migrations } from '../database/migrations';
import { FakeSignedUploads, SignedUploads } from '../signed-uploads';
import { FakeOperatorTokenVerifier } from './fake-operator-token-verifier';
import { NamingTokenVerifier } from './naming-token-verifier';

// The api as production assembles it, AppModule whole, on Postgres. Faked at its edges only:
// who signs in, vendor or operator; Auth0's Management API, as the server at `auth0Issuer`;
// Cloudinary, which the api only signs for. Configuration arrives as production's does,
// through the environment.
export async function bootProductionApp(connectionString: string, auth0Issuer: string): Promise<INestApplication> {
  Object.assign(process.env, {
    DATABASE_CONNECTION_STRING: connectionString,
    // Fixed, not random, as in bootPostgresApp: a re-run must unwrap the keys it left.
    MASTER_KEY: Buffer.alloc(32).toString('base64'),
    AUTH0_ISSUER: auth0Issuer,
    AUTH0_AUDIENCE: 'https://api.marketmiam.test',
    AUTH0_OPS_AUDIENCE: 'https://api.marketmiam.test/ops',
    AUTH0_MGMT_CLIENT_ID: 'management-client',
    AUTH0_MGMT_CLIENT_SECRET: 'management-secret',
  });
  // Imported once the environment is set: the module reads it as it loads.
  const { AppModule } = await import('../app.module');
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(TokenVerifier)
    .useValue(new NamingTokenVerifier())
    .overrideProvider(OperatorTokenVerifier)
    .useValue(new FakeOperatorTokenVerifier())
    .overrideProvider(SignedUploads)
    .useValue(new FakeSignedUploads())
    // startPostgres() has applied database/migrations already.
    .overrideProvider(Migrations)
    .useValue({})
    .compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.listen(0);
  return app;
}
