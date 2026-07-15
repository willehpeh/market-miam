import { INestApplication } from '@nestjs/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { EditStorefrontInformation, InMemorySubdomainRegistry, OpenStorefront } from '@market-miam/market-days';
import { Subscriptions } from './event-sourcing/subscriptions';

const DEMO_VENDOR = 'demo-vendor';
const DEMO_SUBDOMAIN = 'demo';

// Local-dev convenience: the subdomain registry has no command or UI in v1, so
// without this there is no in-app way to make the customer storefront return
// anything on the memory profile. Dev-only — main.ts calls it under
// NODE_ENV=development; production (postgres) never runs it.
// Opens the storefront directly rather than registering a vendor, so the
// OpensStorefronts processor never fires and drain() stays race-free under polling.
export async function seedDev(app: INestApplication): Promise<void> {
  const commands = app.get(CommandGateway);
  const subscriptions = app.get(Subscriptions);
  const registry = app.get(InMemorySubdomainRegistry);

  await commands.execute(new OpenStorefront(DEMO_VENDOR));
  await commands.execute(
    new EditStorefrontInformation(DEMO_VENDOR, 'Chez Demo', 'Cuisine de démonstration maison', '0102030405'),
  );
  await subscriptions.drain();
  await registry.register(DEMO_SUBDOMAIN, DEMO_VENDOR);
}
