import { render, RenderResult, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { PageObject } from '../core/page-object';
import { CatalogueList } from './catalogue-list';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { StorefrontFacade } from '../storefront/storefront.facade';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

// The carte as the vendor runs it: their dishes, the links to add and reorder them, and the
// switch for their prices (ADR 0062).
export class CatalogueListPageObject extends PageObject<CatalogueList> {
  private constructor(view: RenderResult<CatalogueList>) {
    super(view);
  }

  static async render({
    catalogue = new FakeCatalogueFacade(),
    storefront = new FakeStorefrontFacade(),
  }: { catalogue?: CatalogueFacade; storefront?: StorefrontFacade } = {}) {
    const view = await render(CatalogueList, {
      providers: [
        provideRouter([]),
        { provide: CatalogueFacade, useValue: catalogue },
        { provide: StorefrontFacade, useValue: storefront },
      ],
    });
    return new CatalogueListPageObject(view);
  }

  // The dishes

  // A dish's link takes the name of everything on its card, its own name first.
  dishLink(name: RegExp): HTMLElement {
    return screen.getByRole('link', { name });
  }

  // In the order the carte lists them: the links to a dish's edit screen, not those beside them.
  dishLinks(): HTMLElement[] {
    return screen.getAllByRole('link').filter((link) => link.getAttribute('href')?.endsWith('/edit'));
  }

  // A dish's photo is decoration beside its name, with an empty alt, and its placeholder is
  // an icon, so these are the page's only selectors. With several dishes, the first one's.
  photo(): HTMLImageElement {
    return this.view.container.querySelector('img') as HTMLImageElement;
  }

  queryPhoto(): HTMLImageElement | null {
    return this.view.container.querySelector('img');
  }

  photoPlaceholder(): HTMLElement {
    return this.view.container.querySelector('.fa-camera') as HTMLElement;
  }

  // Adding and reordering

  addDishLink(): HTMLElement {
    return screen.getByRole('link', { name: /ajouter/i });
  }

  reorderLink(): HTMLElement {
    return screen.getByRole('link', { name: /changer l'ordre/i });
  }

  queryReorderLink(): HTMLElement | null {
    return screen.queryByRole('link', { name: /changer l'ordre/i });
  }

  // The prices on the public carte

  pricesSwitch(): HTMLElement {
    return screen.getByRole('switch');
  }

  queryPricesSwitch(): HTMLElement | null {
    return screen.queryByRole('switch');
  }

  hidePrices(): this {
    return this.press(this.pricesSwitch());
  }

  showPrices(): this {
    return this.press(this.pricesSwitch());
  }
}
