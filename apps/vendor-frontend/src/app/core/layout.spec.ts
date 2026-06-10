import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Layout } from './layout';
import { Auth } from '../auth/auth';
import { FakeAuth } from '../auth/fake.auth';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { authFeature } from '../auth/auth.state';
import { AuthEffects } from '../auth/auth.effects';
import { AuthFacade } from '../auth/auth.facade';

describe('Layout', () => {

  let fixture: ComponentFixture<Layout>;
  let debugElement: DebugElement;
  let auth: FakeAuth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideStore(),
        provideState(authFeature),
        provideEffects(AuthEffects),
        AuthFacade,
        { provide: Auth, useClass: FakeAuth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(Layout);
    debugElement = fixture.debugElement;
    auth = TestBed.inject(Auth) as FakeAuth;
    fixture.detectChanges();
  });

  it('should not display the logout button if the user is not logged in and the auth status is not loading', () => {
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should not display the logout button if auth status is loading', () => {
    auth.setLoading(true);
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should display the logout button if the user is logged in', () => {
    auth.login();
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeTruthy();
  });

  it('should logout when clicked', () => {
    auth.login();
    fixture.detectChanges();
    debugElement.query(By.css('#logout-button')).triggerEventHandler('click', null);
    expect(auth.loggedOut).toBe(true);
  });

  it('should not offer logout while the auth status is loading, even if the user is logged in', () => {
    auth.login();
    auth.setLoading(true);
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should not treat the user as logged in until the auth status has finished loading', () => {
    auth.setLoading(true);
    auth.login();
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();

    auth.setLoading(false);
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeTruthy();
  });
});
