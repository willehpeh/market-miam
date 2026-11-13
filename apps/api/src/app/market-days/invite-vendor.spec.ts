import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { InMemoryVendorAccounts, InviteVendor } from '@market-miam/market-days';
import { bootApiTestApp, FIXED_NOW } from '../testing/api-test-app';
import { Subscriptions } from '../event-sourcing/subscriptions';

describe('Inviting a vendor', () => {
  let app: INestApplication;
  let vendorAccounts: InMemoryVendorAccounts;

  beforeEach(async () => {
    vendorAccounts = new InMemoryVendorAccounts();
    app = await bootApiTestApp({ vendorAccounts });
  });

  afterEach(async () => {
    await app.close();
  });

  it("opens the invited vendor's account", async () => {
    await app.get(CommandGateway).execute(new InviteVendor('new-vendor', FIXED_NOW, 'marie@example.com'));
    await app.get(Subscriptions).drain();

    expect(vendorAccounts.all()).toEqual([{ email: 'marie@example.com', vendorId: 'new-vendor' }]);
  });
});
