import { TestBed } from '@angular/core/testing';
import { StorefrontPage } from './storefront-page';
import { StorefrontViewModel } from './storefront-view-model';

const ACME: StorefrontViewModel = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverUrl: null,
  dishes: [],
};

describe('StorefrontPage', () => {
  it('renders the vendor name and phone for a published storefront', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Acme Bakery');
    expect(text).toContain('0102030405');
  });

  it('shows a coming-soon message with the title for an unpublished storefront', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', { status: 'coming-soon', name: 'Chez Demo' } satisfies StorefrontViewModel);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Bientôt en ligne');
    expect(text).toContain('Chez Demo');
  });

  it('shows a not-found message when there is no storefront', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent as string).toContain('introuvable');
  });
});
