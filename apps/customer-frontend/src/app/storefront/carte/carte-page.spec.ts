import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CartePage } from './carte-page';
import { StorefrontFeed } from '../storefront-feed';
import { StorefrontViewModel } from '../storefront-view-model';

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
    { itemId: 'item-2', name: 'Tarte tatin', description: 'Aux pommes', priceLabel: '6,00 €', photo: null },
  ],
  upcomingMarkets: [],
};

function drag(type: string, clientY: number): Event {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientY, pointerType: 'mouse', pointerId: 1 });
  return event;
}

function render(storefront: StorefrontViewModel | null) {
  TestBed.inject(StorefrontFeed).view.set(storefront);
  const fixture = TestBed.createComponent(CartePage);
  fixture.detectChanges();
  return fixture;
}

describe('CartePage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), StorefrontFeed, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('lists every item the vendor makes, with prices', () => {
    const text = render(ACME).nativeElement.textContent as string;

    expect(text).toContain('Notre carte');
    expect(text).toContain('Bœuf bourguignon');
    expect(text).toContain('13,00 €');
    expect(text).toContain('Tarte tatin');
    expect(text).toContain('6,00 €');
  });

  // A page of its own is a browse, not a list you scan past on the way to something else —
  // so the items get the big card, the same one the day's menu uses.
  it('shows each item as a card, with its photo or an icon in its place', () => {
    const cards = render(ACME).nativeElement.querySelectorAll('app-item-card');

    expect(cards.length).toBe(2);
    const photo = cards[0].querySelector('img') as HTMLImageElement;
    expect(photo.src).toBe('https://cdn.test/photo/item-1');
    expect(photo.getAttribute('srcset')).toBe('https://cdn.test/photo/item-1 800w, https://cdn.test/photo/item-1-big 1600w');
    // Without sizes the browser assumes 100vw and over-fetches from the ladder.
    expect(photo.getAttribute('sizes')).toBeTruthy();
    expect(cards[1].querySelector('img')).toBeNull();
    expect(cards[1].querySelector('.fa-utensils')).not.toBeNull();
  });

  it('opens the item sheet from a card, keeping the icon for an item with no photo', () => {
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('app-item-card [data-item="item-2"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Aux pommes');
    expect(dialog.querySelector('img')).toBeNull();
    expect(dialog.querySelector('.fa-utensils')).not.toBeNull();
  });

  // Most visitors arrive from a search result with nothing to go back to, so the way home
  // is named after the vendor rather than being a "retour".
  it('leads back to the storefront under the vendor name', () => {
    const link = render(ACME).nativeElement.querySelector('header a') as HTMLAnchorElement;

    expect(link.getAttribute('href')).toBe('/');
    expect(link.textContent).toContain('Acme Bakery');
  });

  it('opens the item sheet with the full details when an item is clicked', () => {
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('[data-item="item-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Bœuf bourguignon');
    expect(dialog.textContent).toContain('Mijoté 7 heures');
    expect(dialog.textContent).toContain('13,00 €');
    // The same candidates as the card, so the sheet opens on a photo the browser
    // already has instead of fetching a second URL while the old pixels linger.
    const photo = dialog.querySelector('img') as HTMLImageElement;
    expect(photo.src).toBe('https://cdn.test/photo/item-1');
    expect(photo.getAttribute('srcset')).toBe('https://cdn.test/photo/item-1 800w, https://cdn.test/photo/item-1-big 1600w');
    expect(photo.getAttribute('sizes')).toBeTruthy();
  });

  it('lists the variants in the sheet for an item with variants', () => {
    const fixture = render({
      ...ACME,
      items: [
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
    });

    (fixture.nativeElement.querySelector('[data-item="pizza"]') as HTMLElement).click();
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
  it('keeps the paragraph breaks a vendor typed into an item and its formats', () => {
    const fixture = render({
      ...ACME,
      items: [
        {
          itemId: 'pizza',
          name: 'Pizza',
          description: 'Pâte maturée 48 h.\n\nFour à bois.',
          priceLabel: 'dès 9,00 €',
          variants: [{ name: 'Margherita', description: '250 g\npour une personne', priceLabel: '9,00 €' }],
          photo: null,
        },
      ],
    });

    (fixture.nativeElement.querySelector('[data-item="pizza"]') as HTMLElement).click();
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    const description = Array.from(dialog.querySelectorAll('p')).find((p) => p.textContent?.includes('Pâte maturée'));
    const detail = Array.from(dialog.querySelectorAll('span')).find((s) => s.textContent?.includes('250 g'));
    expect(description?.textContent).toContain('\n\n');
    expect(description?.className).toContain('whitespace-pre-line');
    expect(detail?.className).toContain('whitespace-pre-line');
  });

  it('scrolls the whole sheet content, photo and title included', () => {
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('[data-item="item-1"]') as HTMLElement).click();
    fixture.detectChanges();

    const scroller = fixture.nativeElement.querySelector('dialog .overflow-y-auto') as HTMLElement;
    expect(scroller.querySelector('img')).not.toBeNull();
    expect(scroller.textContent).toContain('Bœuf bourguignon');
    expect(scroller.textContent).toContain('13,00 €');
    expect(scroller.textContent).toContain('Mijoté 7 heures');
  });

  // The dialog element survives between items, and an <img> keeps its old pixels on a
  // src change until the new photo decodes — so a sheet that closes full must reopen
  // empty, or the next item flashes the previous item's photo while its own downloads.
  it('empties the sheet when it closes, so the next item never opens on the previous photo', async () => {
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('[data-item="item-1"]') as HTMLElement).click();
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    expect(dialog.querySelector('img')).not.toBeNull();

    dialog.click();
    // The close event is queued as a task, not dispatched inside close().
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(dialog.open).toBe(false);
    expect(dialog.querySelector('img')).toBeNull();
  });

  it('closes the item sheet on a backdrop click, but not when its content is clicked', () => {
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('[data-item="item-1"]') as HTMLElement).click();
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

  it('dismisses the item sheet when its content is dragged past the threshold, but snaps back on a small drag', () => {
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('[data-item="item-1"]') as HTMLElement).click();
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
    const fixture = render(ACME);

    (fixture.nativeElement.querySelector('[data-item="item-1"]') as HTMLElement).click();
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

  it('shows a coming-soon message for an unpublished storefront', () => {
    const text = render({ status: 'coming-soon', name: 'Chez Demo' }).nativeElement.textContent as string;

    expect(text).toContain('Bientôt en ligne');
    expect(text).toContain('Chez Demo');
  });

  it('shows a not-found message when there is no storefront', () => {
    expect(render(null).nativeElement.textContent as string).toContain('introuvable');
  });
});
