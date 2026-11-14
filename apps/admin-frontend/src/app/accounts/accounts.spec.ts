import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FakeOperatorApi } from '../core/http/fake-operator-api';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Accounts } from './accounts';
import { HttpAccounts } from './http.accounts';
import { accountsFeature } from './accounts.state';
import { AccountsEffects } from './accounts.effects';
import { AccountsFacade } from './accounts.facade';
import { StoreAccountsFacade } from './store.accounts.facade';
import { Invitations } from '../invitations/invitations';
import { HttpInvitations } from '../invitations/http.invitations';
import { invitationFeature } from '../invitations/invitation.state';
import { InvitationEffects } from '../invitations/invitation.effects';
import { InvitationFacade } from '../invitations/invitation.facade';
import { StoreInvitationFacade } from '../invitations/store.invitation.facade';
import { Erasures } from '../erasures/erasures';
import { HttpErasures } from '../erasures/http.erasures';
import { erasureFeature } from '../erasures/erasure.state';
import { ErasureEffects } from '../erasures/erasure.effects';
import { ErasureFacade } from '../erasures/erasure.facade';
import { StoreErasureFacade } from '../erasures/store.erasure.facade';

const ACME = { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' };
const BRIOCHE = { email: 'owner@brioche.test', vendorId: 'brioche-co', subdomain: null };

// The account list from its facade to the operator API (ADR 0061), with the invitations that join
// it and the erasures that mark it.
describe('Accounts', () => {
  let facade: AccountsFacade;
  let invitations: InvitationFacade;
  let erasures: ErasureFacade;
  let api: FakeOperatorApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Accounts, useClass: HttpAccounts },
        { provide: Invitations, useClass: HttpInvitations },
        { provide: Erasures, useClass: HttpErasures },
        provideStore(),
        provideState(accountsFeature),
        provideState(invitationFeature),
        provideState(erasureFeature),
        provideEffects(AccountsEffects, InvitationEffects, ErasureEffects),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccountsFacade, useClass: StoreAccountsFacade },
        { provide: InvitationFacade, useClass: StoreInvitationFacade },
        { provide: ErasureFacade, useClass: StoreErasureFacade },
      ],
    });
    facade = TestBed.inject(AccountsFacade);
    invitations = TestBed.inject(InvitationFacade);
    erasures = TestBed.inject(ErasureFacade);
    api = new FakeOperatorApi(TestBed.inject(HttpTestingController));
  });

  afterEach(() => api.verify());

  it('loads every account from the operator API', () => {
    facade.load();

    const request = api.accounts();
    expect(request.method).toBe('GET');
    request.answer([ACME]);

    expect(facade.accounts()).toEqual([ACME]);
  });

  it('reports loading while the accounts are in flight, and only then', () => {
    expect(facade.loading()).toBe(false);

    facade.load();
    const request = api.accounts();
    expect(facade.loading()).toBe(true);

    request.answer([ACME]);
    expect(facade.loading()).toBe(false);
  });

  it('reports a failure to load, and starts the next attempt without it', () => {
    facade.load();
    api.accounts().fail();

    expect(facade.failed()).toBe(true);
    expect(facade.loading()).toBe(false);

    facade.load();
    expect(facade.failed()).toBe(false);
    api.accounts().answer([ACME]);
  });

  // The account list passes the operator guard, as every operator route does: its 401 or 403
  // is the API refusing this sign-in, not a list that failed to load.
  it.each([401, 403] as const)('reports the sign-in refused when the API answers %i', (status) => {
    facade.load();
    api.accounts().refuse(status);

    expect(facade.refused()).toBe(true);
    expect(facade.failed()).toBe(false);
    expect(facade.loading()).toBe(false);
  });

  // The account opens once the processor has run; until the next load, the list shows the
  // invitation, in its place by address, with the vendorId the api minted (ADR 0060).
  it('lists a vendor as invited once the API accepts the invitation', () => {
    facade.load();
    api.accounts().answer([ACME]);

    invitations.invite('marie@example.com');
    api.invitation().accept({ vendorId: 'new-vendor' });

    expect(facade.accounts()).toEqual([
      { email: 'marie@example.com', vendorId: 'new-vendor', subdomain: null, invited: true },
      ACME,
    ]);
  });

  // The invited row stands in for the account; Auth0 has the last word at the next load.
  it('replaces an invited row with what the API holds at the next load', () => {
    facade.load();
    api.accounts().answer([ACME]);
    invitations.invite('marie@example.com');
    api.invitation().accept({ vendorId: 'new-vendor' });

    facade.load();
    const opened = { email: 'marie@example.com', vendorId: 'new-vendor', subdomain: null };
    api.accounts().answer([opened, ACME]);

    expect(facade.accounts()).toEqual([opened, ACME]);
  });

  // The account closes once the processor has run; until the next load, the list shows the
  // vendor as erased, in their place (ADR 0063).
  it('lists a vendor as erased once the API accepts the erasure', () => {
    facade.load();
    api.accounts().answer([ACME, BRIOCHE]);

    erasures.erase('acme-bakery');
    api.erasureOf('acme-bakery').accept();

    expect(facade.accounts()).toEqual([{ ...ACME, erased: true }, BRIOCHE]);
  });
});
