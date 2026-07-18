import { INestApplication } from '@nestjs/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import {
  AddItemToCatalogue,
  DeclareAbsence,
  EditStorefrontInformation,
  InMemorySubdomainRegistry,
  OpenStorefront,
  PublishStorefront,
  RegisterMarketSchedule,
  SetStorefrontCoverPhoto,
} from '@market-miam/market-days';
import { Subscriptions } from './event-sourcing/subscriptions';

const DEMO_VENDOR = 'demo-vendor';
const DEMO_SUBDOMAIN = 'demo';
const DEMO_COVER = 'v1784235195/demo-cover_ghvwt5';

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
  await commands.execute(new SetStorefrontCoverPhoto(DEMO_VENDOR, DEMO_COVER));
  await commands.execute(new AddItemToCatalogue('demo-dish-1', DEMO_VENDOR, 'Bœuf bourguignon', 'Mijoté 7 heures au vin rouge', 1300, 'v1784320097/demo-dish1_p1veiv'));
  await commands.execute(new AddItemToCatalogue('demo-dish-2', DEMO_VENDOR, 'Tarte tatin', 'Aux pommes caramélisées', 600, 'v1784320098/demo-dish2_pmotbl'));
  await commands.execute(new AddItemToCatalogue('demo-dish-3', DEMO_VENDOR, 'Soupe du jour', 'Selon le marché', 500));
  await commands.execute(new RegisterMarketSchedule({
    vendorId: DEMO_VENDOR,
    scheduleId: 'demo-schedule',
    startDate: new Date().toISOString().slice(0, 10),
    market: { id: 'demo-market', name: 'Marché de la Bastille', streetAddress: 'Boulevard Richard-Lenoir', codePostal: '75011', town: 'Paris', pitch: 'Allée centrale' },
    days: [{ day: 'SAT', startTime: '09:00', endTime: '13:00' }],
    frequency: { weeks: 1 },
  }));
  const absentSaturday = upcomingSaturday(1);
  await commands.execute(new DeclareAbsence({ vendorId: DEMO_VENDOR, scheduleId: 'demo-schedule', from: absentSaturday, to: absentSaturday }));
  await commands.execute(new PublishStorefront(DEMO_VENDOR));
  await subscriptions.drain();
  await registry.register(DEMO_SUBDOMAIN, DEMO_VENDOR);
}

// The 2nd upcoming Saturday (UTC, matching LocalDate's day-of-week math), so the
// demo storefront shows one market flagged as cancelled.
function upcomingSaturday(weeksAhead: number): string {
  const date = new Date();
  while (date.getUTCDay() !== 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCDate(date.getUTCDate() + 7 * weeksAhead);
  return date.toISOString().slice(0, 10);
}
