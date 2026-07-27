import { TestBed } from '@angular/core/testing';
import { StorefrontPage } from './storefront-page';
import { StorefrontViewModel } from './storefront-view-model';

const ACME: StorefrontViewModel = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverUrl: null,
  socialImageUrl: null,
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
  upcomingMarkets: [
    { weekday: 'JEU', day: '18', month: 'JUIN', marketName: 'Marché Saint-Antoine', hours: '8h – 13h30', address: 'Quai Saint-Antoine, Lyon', cancelled: false },
    { weekday: 'MAR', day: '23', month: 'JUIN', marketName: 'Marché de la Croix-Rousse', hours: '8h – 13h', address: 'Lyon', cancelled: true },
  ],
};

function drag(type: string, clientY: number): Event {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientY, pointerType: 'mouse', pointerId: 1 });
  return event;
}

// jsdom's scrollTop is a plain property, so it would accept a write the browser drops. CSSOM
// ignores scrollTop on an element with no layout box, and a closed <dialog> is display:none.
function trackScrollTop(scroller: HTMLElement, dialog: HTMLDialogElement): void {
  let position = 0;
  Object.defineProperty(scroller, 'scrollTop', {
    configurable: true,
    get: () => position,
    set: (value: number) => {
      if (dialog.open) {
        position = value;
      }
    },
  });
}

describe('StorefrontPage', () => {
  it('renders the vendor name, description and phone for a published storefront', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Acme Bakery');
    expect(text).toContain('Fresh bread daily');
    expect(text).toContain('0102030405');
  });

  // jsdom lays nothing out, so the class is the only observable trace of the behaviour.
  it('keeps the paragraph breaks a vendor typed into their description', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', {
      ...ACME,
      description: 'Pains au levain, farine bio.\n\nCuisson au feu de bois.',
    });
    fixture.detectChanges();

    const paragraphs = Array.from(fixture.nativeElement.querySelectorAll('p')) as HTMLParagraphElement[];
    const description = paragraphs.find((p) => p.textContent?.includes('Pains au levain'));
    expect(description?.textContent).toContain('\n\n');
    expect(description?.className).toContain('whitespace-pre-line');
  });

  it('credits Market Miam in the footer with a link to the homepage', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector('footer') as HTMLElement;
    expect(footer.textContent).toContain('Vitrine mijotée par');
    const link = footer.querySelector('a[href="https://marketmiam.fr"]') as HTMLAnchorElement;
    expect(link.textContent?.trim()).toBe('Market Miam');
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

  it('renders the upcoming markets with a date badge and details, flagging cancelled ones', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Prochains marchés');
    expect(text).toContain('JEU');
    expect(text).toContain('18');
    expect(text).toContain('JUIN');
    expect(text).toContain('Marché Saint-Antoine');
    expect(text).toContain('8h – 13h30');
    expect(text).toContain('Quai Saint-Antoine, Lyon');
    expect(text).toContain('Marché de la Croix-Rousse');
    expect(text).toContain('Annulé');
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

  it('lists the variants in the sheet for a dish with variants', () => {
    const withVariantDish: StorefrontViewModel = {
      ...ACME,
      dishes: [
        {
          itemId: 'pizza',
          name: 'Pizza',
          description: 'Wood-fired',
          priceLabel: 'dès 9,00 €',
          variants: [
            { name: 'Margherita', description: 'tomato & basil', priceLabel: '9,00 €' },
            { name: 'Pepperoni', description: 'spicy', priceLabel: '12,00 €' },
          ],
          photo: null,
        },
      ],
    };
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', withVariantDish);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="pizza"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const text = dialog.textContent as string;
    expect(text).toMatch(/formats/i);
    expect(text).toContain('Margherita');
    expect(text).toContain('tomato & basil');
    expect(text).toContain('9,00 €');
    expect(text).toContain('Pepperoni');
    expect(text).toContain('spicy');
    expect(text).toContain('12,00 €');
  });

  // Same reasoning as the storefront description: jsdom lays nothing out, so the class is
  // the only observable trace.
  it('keeps the paragraph breaks a vendor typed into a dish and its formats', () => {
    const multiline: StorefrontViewModel = {
      ...ACME,
      dishes: [
        {
          itemId: 'pizza',
          name: 'Pizza',
          description: 'Pâte maturée 48 h.\n\nFour à bois.',
          priceLabel: 'dès 9,00 €',
          variants: [{ name: 'Margherita', description: '250 g\npour une personne', priceLabel: '9,00 €' }],
          photo: null,
        },
      ],
    };
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', multiline);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="pizza"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const description = Array.from(dialog.querySelectorAll('p')).find((p) => p.textContent?.includes('Pâte maturée'));
    const detail = Array.from(dialog.querySelectorAll('span')).find((s) => s.textContent?.includes('250 g'));
    expect(description?.textContent).toContain('\n\n');
    expect(description?.className).toContain('whitespace-pre-line');
    expect(detail?.className).toContain('whitespace-pre-line');
  });

  it('scrolls the whole sheet content, photo and title included', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const scroller = fixture.nativeElement.querySelector('dialog .overflow-y-auto') as HTMLElement;
    expect(scroller.querySelector('img')).not.toBeNull();
    expect(scroller.textContent).toContain('Bœuf bourguignon');
    expect(scroller.textContent).toContain('13,00 €');
    expect(scroller.textContent).toContain('Mijoté 7 heures');
  });

  it('resets the scroll position when a dish is opened, once the sheet is on screen', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-1"]') as HTMLElement).click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const scroller = fixture.nativeElement.querySelector('dialog .overflow-y-auto') as HTMLElement;
    trackScrollTop(scroller, dialog);
    scroller.scrollTop = 200;
    dialog.click();
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-2"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(scroller.scrollTop).toBe(0);
  });

  it('closes the dish sheet on a backdrop click, but not when its content is clicked', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    (dialog.querySelector('h3') as HTMLElement).click();
    fixture.detectChanges();
    expect(dialog.open).toBe(true);

    dialog.click();
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
  });

  it('dismisses the dish sheet when its content is dragged past the threshold, but snaps back on a small drag', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    Object.defineProperty(dialog, 'offsetHeight', { value: 400, configurable: true });
    const title = dialog.querySelector('h3') as HTMLElement;

    title.dispatchEvent(drag('pointerdown', 100));
    title.dispatchEvent(drag('pointermove', 120));
    title.dispatchEvent(drag('pointerup', 120));
    fixture.detectChanges();
    expect(dialog.open).toBe(true);

    title.dispatchEvent(drag('pointerdown', 100));
    title.dispatchEvent(drag('pointermove', 400));
    title.dispatchEvent(drag('pointerup', 400));
    fixture.detectChanges();
    expect(dialog.open).toBe(false);
  });

  it('scrolls instead of dragging when the sheet content is not at the top', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('[data-dish="dish-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    Object.defineProperty(dialog, 'offsetHeight', { value: 400, configurable: true });
    const scroller = dialog.querySelector('.overflow-y-auto') as HTMLElement;
    scroller.scrollTop = 200;

    scroller.dispatchEvent(drag('pointerdown', 100));
    scroller.dispatchEvent(drag('pointermove', 400));
    scroller.dispatchEvent(drag('pointerup', 400));
    fixture.detectChanges();

    expect(dialog.open).toBe(true);
    expect(dialog.style.transform).toBe('');
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
