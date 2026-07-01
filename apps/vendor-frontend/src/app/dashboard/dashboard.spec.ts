import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Dashboard } from './dashboard';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

describe('Dashboard', () => {
  let fixture: ComponentFixture<Dashboard>;
  let debugElement: DebugElement;
  let storefront: FakeStorefrontFacade;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [{ provide: StorefrontFacade, useClass: FakeStorefrontFacade }],
    }).compileComponents();
    fixture = TestBed.createComponent(Dashboard);
    debugElement = fixture.debugElement;
    storefront = TestBed.inject(StorefrontFacade) as FakeStorefrontFacade;
    fixture.detectChanges();
  });

  it('displays the storefront name and description once loaded', () => {
    storefront.view.set({ name: 'Acme Bakery', description: 'Fresh bread daily', imageReference: '' });
    fixture.detectChanges();

    expect(debugElement.query(By.css('#storefront-name')).nativeElement.textContent).toContain('Acme Bakery');
    expect(debugElement.query(By.css('#storefront-description')).nativeElement.textContent).toContain(
      'Fresh bread daily',
    );
  });

  it('shows a setting-up state while loading', () => {
    storefront.loading.set(true);
    fixture.detectChanges();

    expect(debugElement.query(By.css('#storefront-loading'))).toBeTruthy();
  });

  it('asks the facade to load on init', () => {
    expect(storefront.loaded).toBe(true);
  });
});
