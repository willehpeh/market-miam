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

const ACCOUNTS = (url: string) => url.endsWith('/api/ops/accounts');

const ACME = { email: 'owner@acme.test', vendorId: 'acme-bakery', subdomain: 'acme' };

// The account list from its facade to the operator API (ADR 0061).
describe('Accounts', () => {
  let facade: AccountsFacade;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Accounts, useClass: HttpAccounts },
        provideStore(),
        provideState(accountsFeature),
        provideEffects(AccountsEffects),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AccountsFacade, useClass: StoreAccountsFacade },
      ],
    });
    facade = TestBed.inject(AccountsFacade);
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
});
