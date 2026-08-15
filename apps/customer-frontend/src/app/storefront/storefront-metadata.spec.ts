import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { StorefrontMetadata } from './storefront-metadata';
import { StorefrontViewModel } from './storefront-view-model';

const ORIGIN = 'https://acme.marketmiam.fr';

const PUBLISHED: StorefrontViewModel = {
  status: 'published',
  name: 'Acme Bakery',
  description: 'Fresh bread daily',
  phone: '0102030405',
  coverReference: 'v7/cover',
  socialImageUrl: 'https://cdn.test/cover-630',
  items: [],
  upcomingMarkets: [],
};

describe('StorefrontMetadata', () => {
  let metadata: StorefrontMetadata;
  let title: Title;
  let meta: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    metadata = TestBed.inject(StorefrontMetadata);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
  });

  const content = (selector: string): string | null => meta.getTag(selector)?.content ?? null;
  const canonical = (): string | null =>
    document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null;

  it('sets the vendor name as the title and a large-image card from the hero for a published storefront', () => {
    metadata.set(PUBLISHED, ORIGIN);

    expect(title.getTitle()).toBe('Acme Bakery');
    expect(content('property="og:title"')).toBe('Acme Bakery');
    expect(content('property="og:description"')).toBe('Fresh bread daily');
    expect(content('property="og:image"')).toBe('https://cdn.test/cover-630');
    expect(content('property="og:url"')).toBe(ORIGIN);
    expect(canonical()).toBe(ORIGIN);
    expect(content('property="og:site_name"')).toBe('Market Miam');
    expect(content('name="twitter:card"')).toBe('summary_large_image');
    expect(content('name="twitter:image"')).toBe('https://cdn.test/cover-630');
  });

  it('falls back to a generated description when the vendor has none', () => {
    metadata.set({ ...PUBLISHED, description: '' }, ORIGIN);

    expect(content('property="og:description"')).toBe(
      'Découvrez le stand de Acme Bakery et ses prochains marchés sur Market Miam.',
    );
  });

  it('uses a plain summary card with no image for a published storefront without a cover photo', () => {
    metadata.set({ ...PUBLISHED, socialImageUrl: null }, ORIGIN);

    expect(content('name="twitter:card"')).toBe('summary');
    expect(content('property="og:image"')).toBeNull();
    expect(content('name="twitter:image"')).toBeNull();
  });

  it('titles a coming-soon storefront with its name and no card image', () => {
    metadata.set({ status: 'coming-soon', name: 'Chez Demo' }, ORIGIN);

    expect(title.getTitle()).toBe('Chez Demo');
    expect(content('property="og:title"')).toBe('Chez Demo');
    expect(content('property="og:description"')).toBe('Chez Demo arrive bientôt sur Market Miam.');
    expect(content('property="og:image"')).toBeNull();
  });

  it('falls back to the default title for a not-found storefront', () => {
    metadata.set(null, ORIGIN);

    expect(title.getTitle()).toBe('Votre marchand');
    expect(content('property="og:title"')).toBe('Votre marchand');
    expect(content('property="og:image"')).toBeNull();
  });

  // og:url is what a share preview reads; rel=canonical is what a crawler indexes on. The
  // tag is found-or-created, so a second render moves the href rather than stacking a tag.
  it('keeps one canonical link, pointed at the page it was last given', () => {
    metadata.set(PUBLISHED, `${ORIGIN}/carte`);
    metadata.set(PUBLISHED, ORIGIN);

    expect(document.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
    expect(canonical()).toBe(ORIGIN);
  });
});
