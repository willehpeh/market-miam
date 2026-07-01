import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { Auth } from './core/auth/auth';
import { FakeAuth } from './core/auth/fake.auth';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { authFeature } from './core/auth/auth.state';
import { AuthEffects } from './core/auth/auth.effects';
import { AuthFacade } from './core/auth/auth.facade';
import { StoreAuthFacade } from './core/auth/store.auth.facade';
import { StorefrontFacade } from './storefront/storefront.facade';
import { FakeStorefrontFacade } from './storefront/fake.storefront.facade';

describe('App', () => {

  let fixture: ComponentFixture<App>;
  let auth: FakeAuth;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(appRoutes),
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects),
        { provide: AuthFacade, useClass: StoreAuthFacade },
        { provide: Auth, useClass: FakeAuth },
        { provide: StorefrontFacade, useClass: FakeStorefrontFacade }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    auth = TestBed.inject(Auth) as FakeAuth;
    router = TestBed.inject(Router);
    await router.navigate(['/']);
    fixture.detectChanges();
  });

  it('smoke', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should offer the user the chance to log in again once they have logged out', () => {
    auth.login();
    fixture.detectChanges();
    fixture.debugElement.query(By.css('#logout-button')).triggerEventHandler('click', null);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('#login-button'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should redirect the vendor to the dashboard when login succeeds', async () => {
    auth.login();
    await fixture.whenStable();

    expect(router.url).toBe('/dashboard');
  });

  it('should bounce an anonymous visitor away from the dashboard', async () => {
    await router.navigateByUrl('/dashboard');

    expect(router.url).toBe('/');
  });
});
