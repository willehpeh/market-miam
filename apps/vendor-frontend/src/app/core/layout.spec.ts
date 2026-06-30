import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Layout } from './layout';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { AuthFacade } from './auth/auth.facade';
import { FakeAuthFacade } from './auth/fake.auth.facade';

describe('Layout', () => {

  let fixture: ComponentFixture<Layout>;
  let debugElement: DebugElement;
  let auth: FakeAuthFacade;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        { provide: AuthFacade, useClass: FakeAuthFacade },
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(Layout);
    debugElement = fixture.debugElement;
    auth = TestBed.inject(AuthFacade) as FakeAuthFacade;
    fixture.detectChanges();
  });

  it('should not display the logout button if the user is not authenticated', () => {
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should display the logout button if the user is authenticated', () => {
    auth.status.set('authenticated');
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeTruthy();
  });

  it('should not display the logout button while the auth status is pending', () => {
    auth.status.set('pending');
    fixture.detectChanges();
    expect(debugElement.query(By.css('#logout-button'))).toBeNull();
  });

  it('should logout when clicked', () => {
    auth.status.set('authenticated');
    fixture.detectChanges();
    debugElement.query(By.css('#logout-button')).triggerEventHandler('click', null);
    expect(auth.loggedOut).toBe(true);
  });
});
