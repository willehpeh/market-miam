import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { Auth } from './auth/auth';
import { FakeAuth } from './auth/fake.auth';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('App', () => {

  let fixture: ComponentFixture<App>;
  let debugElement: DebugElement;
  let auth: FakeAuth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Auth, useClass: FakeAuth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    debugElement = fixture.debugElement;
    auth = TestBed.inject(Auth) as FakeAuth;
    fixture.detectChanges();
  });

  it('smoke', () => {
    expect(App).toBeDefined();
  });

  it('should display the login button if the user is not logged in and the auth status is not loading', () => {
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeTruthy();
  });

  it('should not display the logout button if the user is not logged in and the auth status is not loading', () => {
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should not display the login button if auth status is loading', () => {
    auth.setLoading(true);
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeNull();
  });

  it('should not display the logout button if auth status is loading', () => {
    auth.setLoading(true);
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should not display the login button if the user is logged in', () => {
    auth.login();
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeNull();
  });

  it('should display the logout button if the user is logged in', () => {
    auth.login();
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeTruthy();
  });

  it('should start login when clicked', () => {
    debugElement.query(By.css('#login-button')).triggerEventHandler('click', null);
    expect(auth.loginStarted).toBe(true);
  });

  it('should logout when clicked', () => {
    auth.login();
    fixture.detectChanges();
    debugElement.query(By.css('#logout-button')).triggerEventHandler('click', null);
    expect(auth.loggedOut).toBe(true);
  })
});
