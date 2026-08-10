import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Clock } from '@market-miam/common';
import { StaticTokenVerifier, type VerifiedVendor } from '@market-miam/auth';
import { AuthModule } from '@market-miam/auth-nestjs';
import { vendorPiiFields } from '@market-miam/market-days';
import { MarketDaysModule } from '../market-days/market-days.module';
import { EventSourcingModule } from '../event-sourcing/event-sourcing.module';
import { PostgresPersistenceModule } from '../persistence/postgres-persistence.module';
import { globalFilters } from '../global-filters';
import { Migrations } from '../database/migrations';
import { FakeSignedUploads, SignedUploads } from '../signed-uploads';
import { testVendor } from './api-test-app';

// Fixed, not random: every instance sharing a connection string must unwrap the
// same data keys, and a scenario re-run against a surviving container must too.
const MASTER_KEY = Buffer.alloc(32).toString('base64');

export interface PostgresAppOptions {
  vendor?: VerifiedVendor;
  clock?: Clock;
  signer?: SignedUploads;
  // Off by default — two instances polling narrate constantly. Turn it on when a
  // scenario is misbehaving and you need to see what the app thinks happened.
  logger?: boolean;
}

// The production graph — postgres adapters, real migrations, real LISTEN/NOTIFY
// poll schedule — with only the two outward boundaries faked: Auth0 (nothing to
// learn from a real IdP here) and Cloudinary (the api never calls it; the browser
// uploads). Boot several against one connection string and the contention between
// them is real: competing pollers on shared checkpoints, concurrent appends.
export async function bootPostgresApp(
  connectionString: string,
  { vendor = testVendor, clock, signer = new FakeSignedUploads(), logger = false }: PostgresAppOptions = {},
): Promise<INestApplication> {
  const builder = Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: true,
        skipProcessEnv: true,
        load: [() => ({ DATABASE_CONNECTION_STRING: connectionString, MASTER_KEY })],
      }),
      AuthModule.forRootAsync({ useFactory: () => new StaticTokenVerifier(vendor) }),
      PostgresPersistenceModule,
      EventSourcingModule.forRoot(vendorPiiFields),
      MarketDaysModule,
    ],
    providers: [...globalFilters],
  });
  // startPostgres() already applied database/migrations. Migrations resolves its
  // dir from __dirname, which only holds the .sql files inside the webpack bundle.
  builder.overrideProvider(Migrations).useValue({});
  builder.overrideProvider(SignedUploads).useValue(signer);
  if (clock) {
    builder.overrideProvider(Clock).useValue(clock);
  }

  const app = (await builder.compile()).createNestApplication(logger ? {} : { logger: false });
  // listen(0), not init(): supertest binds an unbound server per request, which a
  // concurrent burst turns into ECONNRESET. One bound port for the app's lifetime.
  await app.listen(0);
  return app;
}

// Live polling means no drain() to synchronise on — assert on the read model by
// retrying until it agrees or the deadline passes, so a scenario reports the last
// wrong value rather than a bare timeout.
export async function eventually<T>(read: () => Promise<T>, agrees: (value: T) => boolean, withinMs = 30_000): Promise<T> {
  const deadline = Date.now() + withinMs;
  let latest = await read();
  while (!agrees(latest) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    latest = await read();
  }
  return latest;
}
