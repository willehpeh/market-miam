import { afterEach, describe, expect, it, vi } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { CommandGateway } from '@market-miam/event-sourcing';
import { OpenStorefront, VendorStorefrontViews } from '@market-miam/market-days';
import { bootApiTestApp } from '../testing/api-test-app';

// The topology dev actually runs: the in-memory profile's poke-on-append wiring,
// live. Every other API test disables polling and drains explicitly, so this is
// the one place the composed schedule — pokes driving, timer as backstop — is
// exercised end to end. Fake timers prove the poke path: if a projection only
// materialized after advancing the clock, the drive would be the backstop.
describe('in-memory profile polling', () => {
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
    vi.useRealTimers();
  });

  it('projects an append through the poke path, without the backstop timer', async () => {
    vi.useFakeTimers();
    app = await bootApiTestApp({ polling: 'live' });
    await vi.advanceTimersByTimeAsync(0); // leading tick drains the empty store

    await app.get(CommandGateway).execute(new OpenStorefront('poked-vendor'));
    await vi.advanceTimersByTimeAsync(0); // flush the poked poll — no clock advance

    expect(await app.get(VendorStorefrontViews).findByVendor('poked-vendor')).toBeDefined();
  });

  it('stops projecting after shutdown — a poke must not outlive the app', async () => {
    vi.useFakeTimers();
    app = await bootApiTestApp({ polling: 'live' });
    await vi.advanceTimersByTimeAsync(0);
    const commands = app.get(CommandGateway);
    const views = app.get(VendorStorefrontViews);
    await app.close();

    await commands.execute(new OpenStorefront('late-vendor'));
    await vi.advanceTimersByTimeAsync(60_000);

    expect(await views.findByVendor('late-vendor')).toBeUndefined();
  });
});
