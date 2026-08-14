import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { CatalogueList } from './catalogue-list';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { catalogueItem } from './catalogue-item.builder';

async function renderList() {
  const view = await render(CatalogueList, {
    providers: [provideRouter([]), { provide: CatalogueFacade, useClass: FakeCatalogueFacade }],
  });
  const catalogue = TestBed.inject(CatalogueFacade) as FakeCatalogueFacade;
  return { view, catalogue };
}

const item = catalogueItem;

describe('CatalogueList', () => {
  // Warm-only lives in the store facade now — the component asks unconditionally.
  it('loads the catalogue on init', async () => {
    const { catalogue } = await renderList();
    expect(catalogue.loaded).toBe(true);
  });

  it('lists each item with its name and price in euros', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item(), item({ itemId: 'item-2', name: 'Blanquette de veau', price: 1100 })]);
    view.detectChanges();

    expect(screen.getByText('Bœuf bourguignon')).toBeInTheDocument();
    expect(screen.getByText('13,00 €')).toBeInTheDocument();
    expect(screen.getByText('Blanquette de veau')).toBeInTheDocument();
    expect(screen.getByText('11,00 €')).toBeInTheDocument();
  });

  it('shows a variant item as "dès {min} €" with its formats listed', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([{
      itemId: 'pizza',
      name: 'Pizza',
      description: 'Wood-fired',
      imageReference: '',
      variants: [
        { name: 'Petite', description: '', price: 950 },
        { name: 'Grande', description: '', price: 1600 },
      ],
    }]);
    view.detectChanges();

    expect(screen.getByText('dès 9,50 €')).toBeInTheDocument();
    expect(screen.getByText('Petite')).toBeInTheDocument();
    expect(screen.getByText('9,50 €')).toBeInTheDocument();
    expect(screen.getByText('Grande')).toBeInTheDocument();
    expect(screen.getByText('16,00 €')).toBeInTheDocument();
  });

  it('lists the items in catalogue order, as the storefront shows them', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item({ itemId: 'item-1' }), item({ itemId: 'item-2' })]);
    view.detectChanges();

    const editHrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.endsWith('/edit'));
    expect(editHrefs).toEqual(['/dashboard/catalogue/item-1/edit', '/dashboard/catalogue/item-2/edit']);
  });

  it('renders each item photo with a thumbnail rendition', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item({ imageReference: 'v1/items/acme/item-1' })]);
    view.detectChanges();

    expect(view.container.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('c_fill,w_200,h_200,q_auto,f_webp/v1/items/acme/item-1'),
    );
  });

  it('shows a camera placeholder instead of a broken image for an item with no photo', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item({ imageReference: '' })]);
    view.detectChanges();

    expect(view.container.querySelector('img')).toBeNull();
    expect(view.container.querySelector('.fa-camera')).not.toBeNull();
  });

  it('links each item to its edit route', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item()]);
    view.detectChanges();

    expect(screen.getByRole('link', { name: /bœuf bourguignon/i })).toHaveAttribute('href', '/dashboard/catalogue/item-1/edit');
  });

  it('links the add-item button to the new-item route', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item()]);
    view.detectChanges();

    expect(screen.getByRole('link', { name: /ajouter/i })).toHaveAttribute('href', '/dashboard/catalogue/new');
  });

  it('offers to reorder once there are two items to put in an order', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item(), item({ itemId: 'item-2', name: 'Blanquette de veau' })]);
    view.detectChanges();

    expect(screen.getByRole('link', { name: /changer l'ordre/i })).toHaveAttribute('href', '/dashboard/catalogue/order');
  });

  it('has nothing to reorder with a single item', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item()]);
    view.detectChanges();

    expect(screen.queryByRole('link', { name: /changer l'ordre/i })).toBeNull();
  });

  it('says the carte is empty when there are no items', async () => {
    await renderList();
    expect(screen.getByText(/carte est vide/i)).toBeInTheDocument();
  });

  it('drops the empty line once the catalogue has an item', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([item()]);
    view.detectChanges();

    expect(screen.queryByText(/carte est vide/i)).toBeNull();
  });
});
