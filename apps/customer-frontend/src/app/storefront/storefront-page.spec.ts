import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StorefrontPage } from './storefront-page';
import { StorefrontViewModel } from './storefront-view-model';

const ACME: StorefrontViewModel = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverUrl: null,
  socialImageUrl: null,
  items: [
    {
      itemId: 'item-1',
      name: 'Bœuf bourguignon',
      description: 'Mijoté 7 heures',
      priceLabel: '13,00 €',
      photo: {
        src: 'https://cdn.test/photo/item-1',
        srcset: 'https://cdn.test/photo/item-1 800w, https://cdn.test/photo/item-1-big 1600w',
      },
    },
    {
      itemId: 'item-2',
      name: 'Tarte tatin',
      description: 'Aux pommes',
      priceLabel: '6,00 €',
      photo: null,
    },
  ],
  upcomingMarkets: [
    { weekday: 'JEU', day: '18', month: 'JUIN', marketName: 'Marché Saint-Antoine', hours: '8h – 13h30', address: 'Quai Saint-Antoine, Lyon', cancelled: false, inProgress: false, items: [] },
    { weekday: 'MAR', day: '23', month: 'JUIN', marketName: 'Marché de la Croix-Rousse', hours: '8h – 13h', address: 'Lyon', cancelled: true, inProgress: false, items: [] },
  ],
};

describe('StorefrontPage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

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

  // The carte is a page of its own: this one is "should I go", the carte is "what can they
  // make". Listing both left the page repeating every item it had already shown.
  it('points to the carte instead of listing it', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/carte"]') as HTMLAnchorElement;
    expect(link.textContent).toContain('Notre carte');
    expect(fixture.nativeElement.querySelectorAll('[data-item]').length).toBe(0);
    expect(fixture.nativeElement.textContent as string).not.toContain('Bœuf bourguignon');
  });

  it('renders the upcoming markets with a date badge and details, flagging cancelled ones', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Marchés suivants');
    expect(text).toContain('JEU');
    expect(text).toContain('18');
    expect(text).toContain('JUIN');
    expect(text).toContain('Marché Saint-Antoine');
    expect(text).toContain('8h – 13h30');
    expect(text).toContain('Quai Saint-Antoine, Lyon');
    expect(text).toContain('Marché de la Croix-Rousse');
    expect(text).toContain('Annulé');
  });

  // The day's offering belongs above the way into the carte: it is what a customer can
  // actually buy on the next market day, and the carte is everything the vendor ever makes.
  it('leads with the next market and its menu, above the carte', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', {
      ...ACME,
      upcomingMarkets: [
        { ...ACME.upcomingMarkets[0], items: [ACME.items[0]] },
        ACME.upcomingMarkets[1],
      ],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Prochain marché');
    expect(text.indexOf('Prochain marché')).toBeLessThan(text.indexOf('Notre carte'));
  });

  it('lists each market day\'s menu inside its own card', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', {
      ...ACME,
      upcomingMarkets: [ACME.upcomingMarkets[0], { ...ACME.upcomingMarkets[1], items: [ACME.items[1]] }],
    });
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('app-market-card');
    expect(cards.length).toBe(2);
    expect((cards[1].textContent as string)).toContain('Tarte tatin');
    expect((cards[1].textContent as string)).toContain('6,00 €');
  });

  // The card at the top and the first card of the list were the same market a screen apart —
  // identical down to the pixel on a day with no menu planned. tmp/too-much.png.
  it('lists only the markets after the one it leads with', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text.split('Marché Saint-Antoine').length - 1).toBe(1);
    expect(text.indexOf('Marchés suivants')).toBeLessThan(text.indexOf('Marché de la Croix-Rousse'));
  });

  it('says nothing about later markets when the vendor has only the next one', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', { ...ACME, upcomingMarkets: [ACME.upcomingMarkets[0]] });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Prochain marché');
    expect(text).not.toContain('Marchés suivants');
  });

  // The day's menu is browsable like the carte, not a price list: same cards, same sheet.
  // Only the featured card goes this far — repeating full cards for every upcoming market
  // would bury the page.
  it('opens the item sheet from an item on the next market\'s menu', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', {
      ...ACME,
      upcomingMarkets: [{ ...ACME.upcomingMarkets[0], items: [ACME.items[0]] }],
    });
    fixture.detectChanges();

    const menuItem = fixture.nativeElement.querySelector('app-market-card [data-item="item-1"]') as HTMLElement;
    menuItem.click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Mijoté 7 heures');
  });

  it('keeps the upcoming list to names and prices, without item cards', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', {
      ...ACME,
      upcomingMarkets: [ACME.upcomingMarkets[0], { ...ACME.upcomingMarkets[1], items: [ACME.items[0]] }],
    });
    fixture.detectChanges();

    const listCards = fixture.nativeElement.querySelectorAll('app-market-card');
    expect(listCards[1].querySelector('[data-item]')).toBeNull();
    expect(listCards[1].textContent as string).toContain('Bœuf bourguignon');
  });

  it('says nothing about a menu on a day with none planned', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', ACME);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-menu]')).toBeNull();
  });

  it('badges a market that is under way', () => {
    const fixture = TestBed.createComponent(StorefrontPage);
    fixture.componentRef.setInput('storefront', {
      ...ACME,
      upcomingMarkets: [{ ...ACME.upcomingMarkets[0], inProgress: true }],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent as string).toContain('En cours');
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
