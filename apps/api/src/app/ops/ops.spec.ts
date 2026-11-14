import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { INestApplication } from '@nestjs/common';
import { InMemorySubdomainRegistry } from '@market-miam/market-days';
import { bootApiTestApp, FIXED_NOW, fixedClock } from '../testing/api-test-app';
import { NOT_AN_OPERATOR_TOKEN, testOperator } from '../testing/fake-operator-token-verifier';
import { OperatorApi } from '../testing/operator-api';
import { VendorOnRecord } from '../testing/vendor-on-record';
import { EventLog } from '../testing/event-log';

describe('The operator API', () => {
  let app: INestApplication;
  let ops: OperatorApi;
  let log: EventLog;

  beforeEach(async () => {
    app = await bootApiTestApp({
      clock: fixedClock,
      accounts: [
        { email: 'owner@brioche.test', vendorId: 'brioche-co' },
        { email: 'owner@acme.test', vendorId: 'acme-bakery' },
        { email: 'operator@marketmiam.test', vendorId: null },
        { email: null, vendorId: 'no-email-vendor' },
      ],
    });
    ops = new OperatorApi(app);
    log = new EventLog(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('lists every account with its vendor and subdomain, ordered by email', async () => {
    await app.get(InMemorySubdomainRegistry).register('acme', 'acme-bakery');

    await ops.accounts().expect(200, [
      { email: 'operator@marketmiam.test', vendorId: null, subdomain: null },
      { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' },
      { email: 'owner@brioche.test', vendorId: 'brioche-co', subdomain: null },
      { email: null, vendorId: 'no-email-vendor', subdomain: null },
    ]);
  });

  it('invites a vendor, answering with the vendorId it minted', async () => {
    const marie = await ops.inviteVendor('marie@example.com');

    expect(marie.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(await marie.history()).toEqual([
      expect.objectContaining({
        type: 'VendorInvited',
        payload: { vendorId: marie.id, invitedAt: FIXED_NOW, email: 'marie@example.com' },
      }),
    ]);
  });

  it('refuses an address an account already holds, and records nothing', async () => {
    await ops.invite('owner@acme.test').expect(409);

    expect(await log.ofType('VendorInvited')).toEqual([]);
  });

  it('refuses a malformed address, and records nothing', async () => {
    await ops.invite('marie@example').expect(400);

    expect(await log.ofType('VendorInvited')).toEqual([]);
  });

  // Auth0 keeps addresses in lower case: compared any other way, a held one would slip through.
  it('refuses a held address typed in another case', async () => {
    await ops.invite('Owner@ACME.test').expect(409);
  });

  it('records the address in lower case, as its account will hold it', async () => {
    const marie = await ops.inviteVendor('Marie@Example.COM');

    expect((await marie.recorded('VendorInvited'))?.payload).toMatchObject({ email: 'marie@example.com' });
  });

  it("records the operator's Auth0 id in the invitation's metadata", async () => {
    const marie = await ops.inviteVendor('marie@example.com');

    expect((await marie.recorded('VendorInvited'))?.metadata).toMatchObject({ operatorId: testOperator.operatorId });
  });

  // Accepted, not done: the processors carry the erasure out (ADR 0058).
  it('erases a vendor', async () => {
    const marie = await ops.inviteVendor('marie@example.com');

    await ops.erase(marie.id).expect(202);

    expect(await marie.history()).toContainEqual(
      expect.objectContaining({ type: 'VendorErased', payload: { vendorId: marie.id, erasedAt: FIXED_NOW } }),
    );
  });

  it("records the operator's Auth0 id in the erasure's metadata", async () => {
    const marie = await ops.inviteVendor('marie@example.com');

    await ops.erase(marie.id).expect(202);

    expect((await marie.recorded('VendorErased'))?.metadata).toMatchObject({ operatorId: testOperator.operatorId });
  });

  it('refuses to erase a vendor who was never invited or registered', async () => {
    await ops.erase('nobody').expect(400);

    expect(await new VendorOnRecord(app, 'nobody').history()).toEqual([]);
  });

  it('refuses someone signed in who is not an operator', async () => {
    await new OperatorApi(app, NOT_AN_OPERATOR_TOKEN).accounts().expect(403);
  });

  it("refuses a vendor's token", async () => {
    await new OperatorApi(app, 'a-vendor-token').accounts().expect(401);
  });

  it('refuses every operator route to an anonymous caller', async () => {
    const anonymous = new OperatorApi(app, null);
    const routes = anonymous.routes();
    expect(routes.length).toBeGreaterThan(0);

    for (const route of routes) {
      const response = await anonymous.call(route);
      expect({ ...route, status: response.status }).toEqual({ ...route, status: 401 });
    }
  });
});
