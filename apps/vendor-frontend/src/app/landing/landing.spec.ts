import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Landing } from './landing';
import { Auth } from '../auth/auth';
import { FakeAuth } from '../auth/fake.auth';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { authFeature } from '../auth/auth.state';
import { AuthEffects } from '../auth/auth.effects';
import { AuthFacade } from '../auth/auth.facade';

describe('Landing', () => {

  let fixture: ComponentFixture<Landing>;
  let debugElement: DebugElement;
  let auth: FakeAuth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects),
        AuthFacade,
        { provide: Auth, useClass: FakeAuth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(Landing);
    debugElement = fixture.debugElement;
    auth = TestBed.inject(Auth) as FakeAuth;
    fixture.detectChanges();
  });

  it('should display the login button if the user is not logged in and the auth status is not loading', () => {
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeTruthy();
  });

  it('should not display the login button if auth status is loading', () => {
    auth.setLoading(true);
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeNull();
  });

  it('should not display the login button if the user is logged in', () => {
    auth.login();
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeNull();
  });

  it('should start login when clicked', () => {
    debugElement.query(By.css('#login-button')).triggerEventHandler('click', null);
    expect(auth.loginStarted).toBe(true);
  });
});
