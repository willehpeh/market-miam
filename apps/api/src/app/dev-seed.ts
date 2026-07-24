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

// The vendor you sign in as locally by default — DevelopmentTokenVerifier resolves
// a plain `dev` token to this id. Keep in sync with that verifier. Load the vendor
// app with ?vendor=demo-vendor to sign in as the published demo vendor below instead.
const DEV_VENDOR = 'dev-vendor';
const DEV_SUBDOMAIN = 'dev';

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

  // Give the local sign-in vendor a subdomain so its publish gate passes and the
  // storefront URL shows once you finish onboarding through the app. Its storefront,
  // catalogue and schedule you build yourself in the vendor-frontend.
  await registry.register(DEV_SUBDOMAIN, DEV_VENDOR);

  await commands.execute(new OpenStorefront(DEMO_VENDOR));
  await commands.execute(
    new EditStorefrontInformation(DEMO_VENDOR, 'Jean-Pierre et Yvette - Bouchers de la Drôme', `C'est si bon que même ta grand-mère en réclame`, '0102030405'),
  );
  await commands.execute(new SetStorefrontCoverPhoto(DEMO_VENDOR, DEMO_COVER));
  await commands.execute(new AddItemToCatalogue({ itemId: 'demo-dish-1', vendorId: DEMO_VENDOR, name: 'Bœuf bourguignon aux pommes de terre sautées', description: 'Mijoté 7 heures au vin rouge', price: 1300, imageReference: 'v1784320097/demo-dish1_p1veiv' }));
  await commands.execute(new AddItemToCatalogue({ itemId: 'demo-dish-2', vendorId: DEMO_VENDOR, name: 'Tarte tatin', description: 'Notre version du hachis parmentier classique, entièrement pensée autour du canard. Nous confisons les cuisses entières dans leur propre graisse pendant presque une journée — à feu doux et patient — jusqu\'à ce que la chair cède sous la fourchette et se détache toute seule de l\'os.ée à la main, jamais à la machine, puis mêlée à un jus sombre et brillant, déglacé d\'un trait d\'Armagnac et adouci par des oignons fondus jusqu\'à devenir presque     confits. Par-dessus, une généreuse couche de  lait chaud, au beurre en abondance et à unepointe de muscade, façonnée à la fourchette puis enfournée jusqu\'à ce que les crêtes dorent et croustillent tandis quele cœur reste d\'une douceur incroyable. Le toe assez longtemps pour que les bordscaramélisent là où la purée rencontre le plat. Nous terminons par quelques cristaux de fleur de sel et un peu de thym frais. Riche, profondément savoureux et récon plat que l\'on commande quand le temps se gâteet que l\'on a envie d\'être choyé. Servi dans sa cocotte en fonte, accompagné d\'une poignée de frisée vivement assaisonnée pour trancher avec la richesse delle faim à lui seul, ou se partage à deux si le cœur vous en dit.', price: 600, imageReference: 'v1784320098/demo-dish2_pmotbl' }));
  await commands.execute(new AddItemToCatalogue({ itemId: 'demo-dish-3', vendorId: DEMO_VENDOR, name: 'Soupe du jour', description: 'Selon le marché', price: 500 }));
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
  // Subdomain must exist before publishing — it's now a publication requirement (step 14).
  await registry.register(DEMO_SUBDOMAIN, DEMO_VENDOR);
  await commands.execute(new PublishStorefront(DEMO_VENDOR));
  await subscriptions.drain();
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
