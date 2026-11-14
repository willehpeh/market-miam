import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Auth } from './auth';
import { FakeAuth } from './fake.auth';
import { authFeature } from './auth.state';
import { AuthEffects } from './auth.effects';
import { AuthFacade } from './auth.facade';
import { StoreAuthFacade } from './store.auth.facade';

// The sign-in from its facade to the identity provider's port (ADR 0022, 0061).
describe('Sign-in', () => {
  let facade: AuthFacade;
  let auth: FakeAuth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useClass: FakeAuth },
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects),
        { provide: AuthFacade, useClass: StoreAuthFacade },
      ],
    });
    facade = TestBed.inject(AuthFacade);
    auth = TestBed.inject(Auth) as FakeAuth;
  });

  it('is anonymous until someone signs in', () => {
    expect(facade.status()).toBe('anonymous');
    expect(facade.userId()).toBeNull();
  });

  it('signs in when asked, as whom the identity provider says', () => {
    facade.login();

    expect(auth.loginStarted).toBe(true);
    expect(facade.status()).toBe('authenticated');
    expect(facade.userId()).toBe(FakeAuth.USER_ID);
  });

  it('signs out when asked', () => {
    facade.login();

    facade.logout();

    expect(auth.loggedOut).toBe(true);
    expect(facade.status()).toBe('anonymous');
    expect(facade.userId()).toBeNull();
  });

  it('is pending while the identity provider is still loading', () => {
    auth.stillLoading();

    expect(facade.status()).toBe('pending');
  });
});
