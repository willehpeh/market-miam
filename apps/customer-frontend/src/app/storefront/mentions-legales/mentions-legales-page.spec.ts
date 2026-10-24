import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MentionsLegalesPage } from './mentions-legales-page';
import { StorefrontFeed } from '../storefront-feed';
import { StorefrontViewModel } from '../storefront-view-model';
import { Editeur } from '../customer-storefront';

const SOLE_TRADER: Editeur = {
  legalName: 'Marie Dupont',
  address: '12 rue des Halles, 92330 Sceaux',
  siret: '73282932000074',
  contactEmail: 'contact@chez-marie.fr',
  phone: '06 12 34 56 78',
  publicationDirector: 'Marie Dupont',
  vatRegime: 'assujetti',
  vatNumber: 'FR44732829320',
  company: null,
  mediator: null,
};

const COMPANY: Editeur = {
  ...SOLE_TRADER,
  legalName: 'Chez Marie SARL',
  publicationDirector: 'Marie Dupont',
  vatRegime: 'franchise',
  vatNumber: null,
  company: { legalForm: 'SARL', shareCapital: '5 000 €', registryCity: 'Nanterre', siren: '732829320' },
  mediator: { name: 'CM2C', url: 'https://www.cm2c.net' },
};

const published = (editeur: Editeur | null): StorefrontViewModel => ({
  status: 'published',
  editeur,
  vatExempt: false,
  name: 'Chez Marie',
  description: '',
  phone: '06 12 34 56 78',
  coverReference: null,
  socialImageUrl: null,
  items: [],
  upcomingMarkets: [],
});

let view: WritableSignal<StorefrontViewModel | null>;

function render(storefront: StorefrontViewModel | null): HTMLElement {
  view.set(storefront);
  const fixture = TestBed.createComponent(MentionsLegalesPage);
  fixture.detectChanges();
  return fixture.nativeElement;
}

const text = (page: HTMLElement) => (page.textContent ?? '').replace(/\s+/g, ' ');

describe('MentionsLegalesPage', () => {
  beforeEach(() => {
    view = signal<StorefrontViewModel | null>(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: StorefrontFeed, useValue: { view } }],
    });
  });

  it('names an entrepreneur individuel as éditeur and directeur de la publication', () => {
    const page = render(published(SOLE_TRADER));

    expect(page.querySelector('h1')?.textContent).toContain('Mentions légales');
    expect(text(page)).toContain('Marie Dupont');
    expect(text(page)).toContain('12 rue des Halles, 92330 Sceaux');
    expect(text(page)).toContain('SIRET 73282932000074');
    expect(text(page)).toContain('N° de TVA intracommunautaire : FR44732829320');
    expect(text(page)).toContain('Directeur de la publication : Marie Dupont');
    expect(page.querySelector('a[href="mailto:contact@chez-marie.fr"]')).not.toBeNull();
    expect(page.querySelector('a[href="tel:06 12 34 56 78"]')).not.toBeNull();
    expect(text(page)).not.toContain('capital');
    expect(text(page)).not.toContain('Médiateur de la consommation');
  });

  it("gives a société's registration, its représentant as directeur, and its médiateur", () => {
    const page = render(published(COMPANY));

    expect(text(page)).toContain('Chez Marie SARL, SARL au capital de 5 000 €');
    expect(text(page)).toContain('RCS Nanterre 732829320');
    expect(text(page)).toContain('Directeur de la publication : Marie Dupont');
    expect(text(page)).toContain('Médiateur de la consommation : CM2C');
    expect(page.querySelector('a[href="https://www.cm2c.net"]')).not.toBeNull();
  });

  it('says TVA does not apply under the franchise en base', () => {
    const page = render(published(COMPANY));

    expect(text(page)).toContain('TVA non applicable, art. 293 B du CGI');
    expect(text(page)).not.toContain('N° de TVA');
  });

  it('names Market Miam as hébergeur, and Render as its own host', () => {
    const page = render(published(SOLE_TRADER));

    expect(text(page)).toContain('Hébergeur');
    expect(text(page)).toContain('Market Miam');
    expect(text(page)).toContain('Render Services, Inc.');
  });

  it("carries the visitors' privacy policy, naming the vendor in it", () => {
    const page = render(published(COMPANY));

    expect(text(page)).toContain('Cette vitrine est éditée par Chez Marie SARL, qui en rédige le contenu.');
    expect(text(page)).toContain('Le numéro affiché est celui de Chez Marie SARL.');
    expect(text(page)).not.toContain('{traiteur}');
  });

  // An éditeur block with nothing in it would be a page that claims to comply and doesn't.
  it('renders no notice until the vendor has provided their identity', () => {
    const page = render(published(null));

    expect(text(page)).not.toContain('Directeur de la publication');
    expect(text(page)).toContain('Page introuvable');
  });

  it('leads back to the storefront by its name', () => {
    const page = render(published(SOLE_TRADER));

    expect(page.querySelector('header a')?.textContent).toContain('Chez Marie');
  });

  it('shows a storefront not yet published as coming soon', () => {
    const page = render({ status: 'coming-soon', name: 'Chez Marie' });

    expect(page.querySelector('app-coming-soon')).not.toBeNull();
  });

  it('says so when there is no storefront at this address', () => {
    expect(text(render(null))).toContain('Boutique introuvable');
  });
});
