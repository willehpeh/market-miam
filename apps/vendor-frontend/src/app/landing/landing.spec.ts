import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Landing } from './landing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuthFacade } from '../core/auth/auth.facade';
import { FakeAuthFacade } from '../core/auth/fake.auth.facade';

describe('Landing', () => {

  let fixture: ComponentFixture<Landing>;
  let debugElement: DebugElement;
  let auth: FakeAuthFacade;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Landing],
      providers: [
        { provide: AuthFacade, useClass: FakeAuthFacade },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(Landing);
    debugElement = fixture.debugElement;
    auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
    fixture.detectChanges();
  });

  it('should display the login button if the user is anonymous', () => {
    expect(debugElement.query(By.css('#login-button'))).toBeTruthy();
  });

  it('should not display the login button while the auth status is pending', () => {
    auth.status.set('pending');
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeNull();
  });

  it('should not display the login button if the user is authenticated', () => {
    auth.status.set('authenticated');
    fixture.detectChanges();
    expect(debugElement.query(By.css('#login-button'))).toBeNull();
  });

  it('should start login when clicked', () => {
    debugElement.query(By.css('#login-button')).triggerEventHandler('click', null);
    expect(auth.loggedIn).toBe(true);
  });
});
