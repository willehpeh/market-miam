import { screen } from '@testing-library/angular';
import { CatalogueListPageObject } from './catalogue-list.page-object';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { catalogueItem } from './catalogue-item.builder';
import { FakeStorefrontFacade } from '../storefront/fake.storefront.facade';

const storefrontView = (cartePricesVisible: boolean) => ({
  name: 'Chez Marie',
  description: '',
  phone: '',
  imageReference: '',
  subdomain: null,
  published: true,
  cartePricesVisible,
});

const item = catalogueItem;

describe('CatalogueList', () => {
  // Warm-only lives in the store facade now — the component asks unconditionally.
  it('loads the catalogue on init', async () => {
    const catalogue = new FakeCatalogueFacade();
    await CatalogueListPageObject.render({ catalogue });

    expect(catalogue.loaded).toBe(true);
  });

  it('lists each item with its name and price in euros', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item(), item({ itemId: 'item-2', name: 'Blanquette de veau', price: 1100 })]);
    page.detectChanges();

    expect(screen.getByText('Bœuf bourguignon')).toBeInTheDocument();
    expect(screen.getByText('13,00 €')).toBeInTheDocument();
    expect(screen.getByText('Blanquette de veau')).toBeInTheDocument();
    expect(screen.getByText('11,00 €')).toBeInTheDocument();
  });

  it('shows a variant item as "dès {min} €" with its formats listed', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([{
      itemId: 'pizza',
      name: 'Pizza',
      description: 'Wood-fired',
      imageReference: '',
      allergens: ['gluten', 'milk'],
      variants: [
        { name: 'Petite', description: '', price: 950 },
        { name: 'Grande', description: '', price: 1600 },
      ],
    }]);
    page.detectChanges();

    expect(screen.getByText('dès 9,50 €')).toBeInTheDocument();
    expect(screen.getByText('Petite')).toBeInTheDocument();
    expect(screen.getByText('9,50 €')).toBeInTheDocument();
    expect(screen.getByText('Grande')).toBeInTheDocument();
    expect(screen.getByText('16,00 €')).toBeInTheDocument();
  });

  // The live client's dishes predate allergens; this is how they find the ones left to declare.
  it('flags a dish whose allergens are not declared yet', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item({ itemId: 'old', name: 'Tarte tatin', allergens: null }), item({ itemId: 'new', name: 'Parmentier' })]);
    page.detectChanges();

    const flagged = screen.getAllByText('Allergènes à renseigner');
    expect(flagged).toHaveLength(1);
    expect(flagged[0].closest('a')?.textContent).toContain('Tarte tatin');
  });

  // Declared "none" is a declaration, not a gap.
  it('flags nothing on a dish declared free of the 14', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item({ allergens: [] })]);
    page.detectChanges();

    expect(screen.queryByText('Allergènes à renseigner')).not.toBeInTheDocument();
  });

  it('lists the items in catalogue order, as the storefront shows them', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item({ itemId: 'item-1' }), item({ itemId: 'item-2' })]);
    page.detectChanges();

    const editHrefs = page.dishLinks().map((link) => link.getAttribute('href'));
    expect(editHrefs).toEqual(['/dashboard/catalogue/item-1/edit', '/dashboard/catalogue/item-2/edit']);
  });

  it('renders each item photo with a thumbnail rendition', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item({ imageReference: 'v1/items/acme/item-1' })]);
    page.detectChanges();

    expect(page.photo()).toHaveAttribute(
      'src',
      expect.stringContaining('c_fill,w_200,h_200,q_auto,f_webp/v1/items/acme/item-1'),
    );
  });

  it('shows a camera placeholder instead of a broken image for an item with no photo', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item({ imageReference: '' })]);
    page.detectChanges();

    expect(page.queryPhoto()).toBeNull();
    expect(page.photoPlaceholder()).not.toBeNull();
  });

  it('links each item to its edit route', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item()]);
    page.detectChanges();

    expect(page.dishLink(/bœuf bourguignon/i)).toHaveAttribute('href', '/dashboard/catalogue/item-1/edit');
  });

  it('links the add-item button to the new-item route', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item()]);
    page.detectChanges();

    expect(page.addDishLink()).toHaveAttribute('href', '/dashboard/catalogue/new');
  });

  it('offers to reorder once there are two items to put in an order', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item(), item({ itemId: 'item-2', name: 'Blanquette de veau' })]);
    page.detectChanges();

    expect(page.reorderLink()).toHaveAttribute('href', '/dashboard/catalogue/order');
  });

  it('has nothing to reorder with a single item', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item()]);
    page.detectChanges();

    expect(page.queryReorderLink()).toBeNull();
  });

  it('says the carte is empty when there are no items', async () => {
    await CatalogueListPageObject.render();

    expect(screen.getByText(/carte est vide/i)).toBeInTheDocument();
  });

  it('drops the empty line once the catalogue has an item', async () => {
    const catalogue = new FakeCatalogueFacade();
    const page = await CatalogueListPageObject.render({ catalogue });
    catalogue.items.set([item()]);
    page.detectChanges();

    expect(screen.queryByText(/carte est vide/i)).toBeNull();
  });

  // The vendor's own choice about their public carte, on the screen that shows the prices
  // it governs. Opted in, so a vendor who never touched it reads as showing them.
  it('shows the carte prices as displayed when the vendor has not hidden them', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await CatalogueListPageObject.render({ storefront });
    storefront.view.set(storefrontView(true));
    page.detectChanges();

    expect(page.pricesSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Affichés')).toBeInTheDocument();
  });

  it('shows them as masked when the vendor has hidden them', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await CatalogueListPageObject.render({ storefront });
    storefront.view.set(storefrontView(false));
    page.detectChanges();

    expect(page.pricesSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByText('Masqués')).toBeInTheDocument();
  });

  // The choice rides a different feed from the catalogue (the vitrine, loaded once at
  // login). A switch drawn before it lands would tell a vendor who hid their prices that
  // they are showing, and their first tap would save over a state they never saw.
  it('offers no switch until the vitrine has loaded', async () => {
    const page = await CatalogueListPageObject.render();
    page.detectChanges();

    expect(page.queryPricesSwitch()).not.toBeInTheDocument();
  });

  it('hides the prices when the vendor turns the switch off', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await CatalogueListPageObject.render({ storefront });
    storefront.view.set(storefrontView(true));
    page.detectChanges();

    page.hidePrices();

    expect(storefront.cartePricesVisibility).toBe(false);
  });

  it('shows them again when the vendor turns it back on', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await CatalogueListPageObject.render({ storefront });
    storefront.view.set(storefrontView(false));
    page.detectChanges();

    page.showPrices();

    expect(storefront.cartePricesVisibility).toBe(true);
  });

  // Not behind a tooltip: nobody opens one to read what they do not know to ask. It is the
  // sentence that stops a vendor reporting the featured card as a bug, so it stands in the
  // open — but only once hiding has made it true.
  it('warns that the featured market still quotes, once the prices are hidden', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await CatalogueListPageObject.render({ storefront });
    storefront.view.set(storefrontView(false));
    page.detectChanges();

    expect(screen.getByText(/Prochain marché.*affiche toujours ses prix/)).toBeInTheDocument();
  });

  it('leaves the warning out while the prices are showing', async () => {
    const storefront = new FakeStorefrontFacade();
    const page = await CatalogueListPageObject.render({ storefront });
    storefront.view.set(storefrontView(true));
    page.detectChanges();

    expect(screen.queryByText(/Prochain marché.*affiche toujours ses prix/)).not.toBeInTheDocument();
  });
});
