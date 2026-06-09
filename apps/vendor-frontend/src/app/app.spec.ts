import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';
import { Auth } from './auth/auth';
import { FakeAuth } from './auth/fake.auth';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

describe('App', () => {

  let fixture: ComponentFixture<App>;
  let debugElement: DebugElement;
  let auth: Auth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Auth, useClass: FakeAuth }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    debugElement = fixture.debugElement;
    auth = TestBed.inject(Auth);
    fixture.detectChanges();
  });

  it('smoke', () => {
    expect(App).toBeDefined();
  });

  it('should display the login button if the user is not logged in', () => {
    fixture.detectChanges();
    expect(debugElement.query(By.css('button'))).toBeTruthy();
  });

  it('should not display the login button if the user is logged in', () => {
    auth.login();
    fixture.detectChanges();
    expect(debugElement.query(By.css('button'))).toBeNull();
  });
});
