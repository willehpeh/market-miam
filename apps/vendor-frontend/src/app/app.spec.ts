import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { Auth } from './auth/auth';
import { FakeAuth } from './auth/fake.auth';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { appRoutes } from './app.routes';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { authFeature } from './auth/auth.state';
import { AuthEffects } from './auth/auth.effects';
import { AuthFacade } from './auth/auth.facade';

describe('App', () => {

  let fixture: ComponentFixture<App>;
  let auth: FakeAuth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(appRoutes),
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects),
        AuthFacade,
        { provide: Auth, useClass: FakeAuth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    auth = TestBed.inject(Auth) as FakeAuth;
    await TestBed.inject(Router).navigate(['/']);
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
});
