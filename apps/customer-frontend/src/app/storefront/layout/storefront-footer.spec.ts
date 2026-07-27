import { TestBed } from '@angular/core/testing';
import { StorefrontFooter } from './storefront-footer';

const LICENCE_URL = 'https://marketmiam.fr/mentions-legales#licence';

function renderFooter() {
  const fixture = TestBed.createComponent(StorefrontFooter);
  fixture.componentRef.setInput('name', 'Chez Mohamed');
  fixture.componentRef.setInput('phone', '0102030405');
  fixture.detectChanges();
  return fixture;
}

describe('StorefrontFooter', () => {
  it('renders the vendor name and phone', () => {
    const footer: HTMLElement = renderFooter().nativeElement;

    expect(footer.textContent).toContain('Chez Mohamed');
    expect(footer.querySelector('a[href="tel:0102030405"]')).not.toBeNull();
  });

  // AGPL §13 owes the source offer to the users of *this* interface. Storefront
  // visitors never pass through the marketing site, so losing this link would put
  // the deployment out of compliance rather than just out of style.
  it('offers the source code to storefront visitors', () => {
    const footer: HTMLElement = renderFooter().nativeElement;

    const link = footer.querySelector<HTMLAnchorElement>(`a[href="${LICENCE_URL}"]`);

    expect(link?.textContent?.trim()).toBe('Logiciel libre');
  });
});
