import { TestBed } from '@angular/core/testing';
import { StorefrontPage } from './storefront-page';
import { StorefrontViewModel } from './storefront-view-model';

const ACME: StorefrontViewModel = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverUrl: null,
  dishes: [
    {
      itemId: 'dish-1',
      name: 'Bœuf bourguignon',
      description: 'Mijoté 7 heures',
      priceLabel: '13,00 €',
      photo: { cardUrl: 'https://cdn.test/card/dish-1', sheetUrl: 'https://cdn.test/sheet/dish-1' },
    },
    {
      itemId: 'dish-2',
      name: 'Tarte tatin',
      description: 'Aux pommes',
      priceLabel: '6,00 €',
      photo: null,
    },
  ],
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

  it('renders the catalogue dishes with prices, and thumbnails only for dishes with a photo', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Notre carte');
    expect(text).toContain('Bœuf bourguignon');
    expect(text).toContain('13,00 €');
    expect(text).toContain('Tarte tatin');
    expect(text).toContain('6,00 €');
    const thumbs = Array.from(fixture.nativeElement.querySelectorAll('img'))
      .map(img => (img as HTMLImageElement).src);
    expect(thumbs).toContain('https://cdn.test/card/dish-1');
    expect(thumbs.some(src => src.includes('dish-2'))).toBe(false);
  });

  it('opens the dish sheet with the full details when a dish is clicked', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Bœuf bourguignon');
    expect(dialog.textContent).toContain('Mijoté 7 heures');
    expect(dialog.textContent).toContain('13,00 €');
    expect((dialog.querySelector('img') as HTMLImageElement).src).toBe('https://cdn.test/sheet/dish-1');
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
