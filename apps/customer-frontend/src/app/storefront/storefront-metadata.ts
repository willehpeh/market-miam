import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { StorefrontViewModel } from './storefront-view-model';

const SITE_NAME = 'Market Miam';
// Mirrors the static <title> in index.html — the fallback when no vendor resolves.
const DEFAULT_TITLE = 'Votre marchand';
const DEFAULT_DESCRIPTION = 'Retrouvez votre traiteur de marché sur Market Miam.';

type Card = {
  title: string;
  description: string;
  imageUrl: string | null;
  url: string;
};

// Drives the per-vendor <title> and the Open Graph / Twitter tags that social
// crawlers read from the server-rendered <head> — one distinct card per
// subdomain. Set from StorefrontPage during the SSR render pass.
@Injectable({ providedIn: 'root' })
export class StorefrontMetadata {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set(storefront: StorefrontViewModel | null, origin: string): void {
    this.apply(this.cardFor(storefront, origin));
  }

  private cardFor(storefront: StorefrontViewModel | null, origin: string): Card {
    if (!storefront) {
      return { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, imageUrl: null, url: origin };
    }
    if (storefront.status === 'coming-soon') {
      const name = storefront.name ?? DEFAULT_TITLE;
      return { title: name, description: `${name} arrive bientôt sur Market Miam.`, imageUrl: null, url: origin };
    }
    return {
      title: storefront.name,
      description: storefront.description || `Découvrez le stand de ${storefront.name} et ses prochains marchés sur Market Miam.`,
      imageUrl: storefront.socialImageUrl,
      url: origin,
    };
  }

  private apply(card: Card): void {
    this.title.setTitle(card.title);
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: card.url });
    this.meta.updateTag({ property: 'og:title', content: card.title });
    this.meta.updateTag({ name: 'twitter:title', content: card.title });
    this.meta.updateTag({ name: 'description', content: card.description });
    this.meta.updateTag({ property: 'og:description', content: card.description });
    this.meta.updateTag({ name: 'twitter:description', content: card.description });

    if (card.imageUrl) {
      this.meta.updateTag({ property: 'og:image', content: card.imageUrl });
      this.meta.updateTag({ property: 'og:image:width', content: '1200' });
      this.meta.updateTag({ property: 'og:image:height', content: '630' });
      this.meta.updateTag({ property: 'og:image:alt', content: card.title });
      this.meta.updateTag({ name: 'twitter:image', content: card.imageUrl });
      this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    } else {
      this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
      for (const selector of ['property="og:image"', 'property="og:image:width"', 'property="og:image:height"', 'property="og:image:alt"', 'name="twitter:image"']) {
        this.meta.removeTag(selector);
      }
    }
  }
}
