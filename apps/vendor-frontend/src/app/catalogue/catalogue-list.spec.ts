import { TestBed } from '@angular/core/testing';
import { render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { CatalogueList } from './catalogue-list';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { CatalogueItemView } from './catalogue';

async function renderList() {
  const view = await render(CatalogueList, {
    providers: [provideRouter([]), { provide: CatalogueFacade, useClass: FakeCatalogueFacade }],
  });
  const catalogue = TestBed.inject(CatalogueFacade) as FakeCatalogueFacade;
  return { view, catalogue };
}

const dish = (overrides: Partial<CatalogueItemView> = {}): CatalogueItemView => ({
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/dishes/acme/item-1',
  ...overrides,
});

describe('CatalogueList', () => {
  it('loads the catalogue on init when it is empty', async () => {
    const { catalogue } = await renderList();
    expect(catalogue.loaded).toBe(true);
  });

  it('does not reload when the catalogue is already in the store', async () => {
    const catalogue = new FakeCatalogueFacade();
    catalogue.items.set([dish()]);
    await render(CatalogueList, {
      providers: [provideRouter([]), { provide: CatalogueFacade, useValue: catalogue }],
    });

    expect(catalogue.loaded).toBe(false);
  });

  it('lists each dish with its name and price in euros', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([dish(), dish({ itemId: 'item-2', name: 'Blanquette de veau', price: 1100 })]);
    view.detectChanges();

    expect(screen.getByText('Bœuf bourguignon')).toBeInTheDocument();
    expect(screen.getByText('13,00 €')).toBeInTheDocument();
    expect(screen.getByText('Blanquette de veau')).toBeInTheDocument();
    expect(screen.getByText('11,00 €')).toBeInTheDocument();
  });

  it('shows the most recently added dish first', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([dish({ itemId: 'item-1' }), dish({ itemId: 'item-2' })]);
    view.detectChanges();

    const editHrefs = screen
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
      .filter((href) => href?.endsWith('/edit'));
    expect(editHrefs).toEqual(['/dashboard/catalogue/item-2/edit', '/dashboard/catalogue/item-1/edit']);
  });

  it('renders each dish photo with a thumbnail rendition', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([dish({ imageReference: 'v1/dishes/acme/item-1' })]);
    view.detectChanges();

    expect(screen.getByAltText('Bœuf bourguignon')).toHaveAttribute(
      'src',
      expect.stringContaining('c_fill,w_200,h_200,q_auto,f_webp/v1/dishes/acme/item-1'),
    );
  });

  it('shows a camera placeholder instead of a broken image for a dish with no photo', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([dish({ imageReference: '' })]);
    view.detectChanges();

    expect(screen.queryByAltText('Bœuf bourguignon')).toBeNull();
    expect(view.container.querySelector('.fa-camera')).not.toBeNull();
  });

  it('links each dish to its edit route', async () => {
    const { view, catalogue } = await renderList();
    catalogue.items.set([dish()]);
    view.detectChanges();

    expect(screen.getByRole('link', { name: /bœuf bourguignon/i })).toHaveAttribute('href', '/dashboard/catalogue/item-1/edit');
  });

  it('links the add-dish card to the new-dish route', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: /ajouter un plat/i })).toHaveAttribute('href', '/dashboard/catalogue/new');
  });

  it('links back to the dashboard', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: /retour/i })).toHaveAttribute('href', '/dashboard');
  });

  it('shows only the add-dish affordance when the catalogue is empty', async () => {
    await renderList();
    expect(screen.getByRole('link', { name: /ajouter un plat/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /retour/i })).toBeInTheDocument();
  });
});
