import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
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

const ACCOUNTS = (url: string) => url.endsWith('/api/ops/accounts');
const VENDORS = (url: string) => url.endsWith('/api/ops/vendors');

const ACME = { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' };

// The account list from its facade to the operator API (ADR 0061), with the invitations that join it.
describe('Accounts', () => {
  let facade: AccountsFacade;
  let invitations: InvitationFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Accounts, useClass: HttpAccounts },
        { provide: Invitations, useClass: HttpInvitations },
        provideStore(),
        provideState(accountsFeature),
        provideState(invitationFeature),
        provideEffects(AccountsEffects, InvitationEffects),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccountsFacade, useClass: StoreAccountsFacade },
        { provide: InvitationFacade, useClass: StoreInvitationFacade },
      ],
    });
    facade = TestBed.inject(AccountsFacade);
    invitations = TestBed.inject(InvitationFacade);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads every account from the operator API', () => {
    facade.load();

    const request = http.expectOne((req) => ACCOUNTS(req.url));
    expect(request.request.method).toBe('GET');
    request.flush([ACME]);

    expect(facade.accounts()).toEqual([ACME]);
  });

  it('reports loading while the accounts are in flight, and only then', () => {
    expect(facade.loading()).toBe(false);

    facade.load();
    const request = http.expectOne((req) => ACCOUNTS(req.url));
    expect(facade.loading()).toBe(true);

    request.flush([ACME]);
    expect(facade.loading()).toBe(false);
  });

  it('reports a failure to load, and starts the next attempt without it', () => {
    facade.load();
    http.expectOne((req) => ACCOUNTS(req.url)).flush(null, { status: 500, statusText: 'Internal Server Error' });

    expect(facade.failed()).toBe(true);
    expect(facade.loading()).toBe(false);

    facade.load();
    expect(facade.failed()).toBe(false);
    http.expectOne((req) => ACCOUNTS(req.url)).flush([ACME]);
  });

  // The account list passes the operator guard, as every operator route does: its 401 or 403
  // is the API refusing this sign-in, not a list that failed to load.
  it.each([401, 403])('reports the sign-in refused when the API answers %i', (status) => {
    facade.load();
    http.expectOne((req) => ACCOUNTS(req.url)).flush(null, { status, statusText: 'Refused' });

    expect(facade.refused()).toBe(true);
    expect(facade.failed()).toBe(false);
    expect(facade.loading()).toBe(false);
  });

  // The account opens once the processor has run; until the next load, the list shows the
  // invitation, in its place by address, with the vendorId the api minted (ADR 0060).
  it('lists a vendor as invited once the API accepts the invitation', () => {
    facade.load();
    http.expectOne((req) => ACCOUNTS(req.url)).flush([ACME]);

    invitations.invite('marie@example.com');
    http.expectOne((req) => VENDORS(req.url)).flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });

    expect(facade.accounts()).toEqual([
      { email: 'marie@example.com', vendorId: 'new-vendor', subdomain: null, invited: true },
      ACME,
    ]);
  });

  // The invited row stands in for the account; Auth0 has the last word at the next load.
  it('replaces an invited row with what the API holds at the next load', () => {
    facade.load();
    http.expectOne((req) => ACCOUNTS(req.url)).flush([ACME]);
    invitations.invite('marie@example.com');
    http.expectOne((req) => VENDORS(req.url)).flush({ vendorId: 'new-vendor' }, { status: 202, statusText: 'Accepted' });

    facade.load();
    const opened = { email: 'marie@example.com', vendorId: 'new-vendor', subdomain: null };
    http.expectOne((req) => ACCOUNTS(req.url)).flush([opened, ACME]);

    expect(facade.accounts()).toEqual([opened, ACME]);
  });
});
