import { DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Auth } from './auth';
import { FakeAuth } from './fake.auth';
import { LoginButton } from './login-button';

describe('LoginButton', () => {
  let fixture: ComponentFixture<LoginButton>;
  let debugElement: DebugElement;
  let auth: Auth;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginButton],
      providers: [{ provide: Auth, useClass: FakeAuth }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginButton);
    auth = TestBed.inject(Auth);
    debugElement = fixture.debugElement;
    fixture.detectChanges();
  });

  it('should start login when clicked', () => {
    debugElement.query(By.css('button')).triggerEventHandler('click', null);
    expect(auth.isAuthenticated()()).toBe(true);
  });
});
