import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { Auth } from './auth';
import { FakeAuth } from './fake.auth';
import { authFeature } from './auth.state';
import { AuthEffects } from './auth.effects';
import { AuthFacade } from './auth.facade';
import { StoreAuthFacade } from './store.auth.facade';

// The session as the facade reads it off the identity provider, faked at the Auth port.
describe('Auth', () => {
  function signIn(auth: FakeAuth): AuthFacade {
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: auth },
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects),
        provideRouter([]),
        { provide: AuthFacade, useClass: StoreAuthFacade },
      ],
    });
    return TestBed.inject(AuthFacade);
  }

  // While the provider is still asking, a vendor is neither: the landing page must not offer
  // to sign in someone who is, and the guard must not turn them away.
  it('is neither signed in nor signed out while the session settles', () => {
    const auth = new FakeAuth();
    auth.setLoading(true);
    const facade = signIn(auth);

    expect(facade.signedIn()).toBe(false);
    expect(facade.signedOut()).toBe(false);
  });

  it('tells the router nothing until the session is known', () => {
    const auth = new FakeAuth();
    auth.setLoading(true);
    const facade = signIn(auth);
    const told: boolean[] = [];
    facade.signedIn$.subscribe((signedIn) => told.push(signedIn));

    expect(told).toEqual([]);

    auth.setLoading(false);

    expect(told).toEqual([false]);
  });

  it('is signed out once the provider knows no one', () => {
    const facade = signIn(new FakeAuth());

    expect(facade.signedOut()).toBe(true);
    expect(facade.signedIn()).toBe(false);
  });

  it('is signed in once the vendor signs in', () => {
    const facade = signIn(new FakeAuth());
    const told: boolean[] = [];
    facade.signedIn$.subscribe((signedIn) => told.push(signedIn));

    facade.login();

    expect(facade.signedIn()).toBe(true);
    expect(facade.signedOut()).toBe(false);
    expect(told).toEqual([false, true]);
  });
});
