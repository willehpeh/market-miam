import { fireEvent, render, screen } from '@testing-library/angular';
import { provideRouter } from '@angular/router';
import { ReorderItems } from './reorder-items';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { CatalogueItemView } from './catalogue';
import { catalogueItem } from './catalogue-item.builder';

const item = (itemId: string, name: string): CatalogueItemView => catalogueItem({ itemId, name });

async function renderReorder(items: CatalogueItemView[] = []) {
  const catalogue = new FakeCatalogueFacade();
  catalogue.items.set(items);
  const view = await render(ReorderItems, {
    providers: [provideRouter([]), { provide: CatalogueFacade, useValue: catalogue }],
  });
  return { view, catalogue };
}

const rowNames = () =>
  screen.getAllByRole('listitem').map((row) => row.textContent?.replace(/\s+/g, ' ').trim());

describe('ReorderItems', () => {
  it('lists the items in the order the catalogue holds them', async () => {
    await renderReorder([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Blanquette de veau')]);

    expect(rowNames()).toEqual(['Bœuf bourguignon', 'Blanquette de veau']);
  });

  it('moves an item up the list', async () => {
    const { view } = await renderReorder([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Blanquette de veau')]);

    fireEvent.click(screen.getByRole('button', { name: 'Monter Blanquette de veau' }));
    view.detectChanges();

    expect(rowNames()).toEqual(['Blanquette de veau', 'Bœuf bourguignon']);
  });

  it('moves an item down the list', async () => {
    const { view } = await renderReorder([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Blanquette de veau')]);

    fireEvent.click(screen.getByRole('button', { name: 'Descendre Bœuf bourguignon' }));
    view.detectChanges();

    expect(rowNames()).toEqual(['Blanquette de veau', 'Bœuf bourguignon']);
  });

  it('has nowhere to move the items at either end', async () => {
    await renderReorder([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Blanquette de veau')]);

    expect(screen.getByRole('button', { name: 'Monter Bœuf bourguignon' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descendre Blanquette de veau' })).toBeDisabled();
  });

  it('saves the order the vendor arrived at', async () => {
    const { catalogue } = await renderReorder([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Blanquette de veau')]);

    fireEvent.click(screen.getByRole('button', { name: 'Monter Blanquette de veau' }));
    fireEvent.click(screen.getByRole('button', { name: /enregistrer/i }));

    expect(catalogue.reorderedItems).toEqual(['item-2', 'item-1']);
  });

  it('leaves the order alone until it is saved', async () => {
    const { catalogue } = await renderReorder([item('item-1', 'Bœuf bourguignon'), item('item-2', 'Blanquette de veau')]);

    fireEvent.click(screen.getByRole('button', { name: 'Monter Blanquette de veau' }));

    expect(catalogue.reorderedItems).toBeUndefined();
  });

  it('abandons the reordering by returning to the catalogue', async () => {
    await renderReorder([item('item-1', 'Bœuf bourguignon')]);

    expect(screen.getByRole('link', { name: /annuler/i })).toHaveAttribute('href', '/dashboard/catalogue');
  });

  it('loads the catalogue when it arrives cold', async () => {
    const { catalogue } = await renderReorder();

    expect(catalogue.loaded).toBe(true);
  });

  it('shows the items once a cold catalogue has loaded', async () => {
    const { view, catalogue } = await renderReorder();

    catalogue.items.set([item('item-1', 'Bœuf bourguignon')]);
    view.detectChanges();

    expect(rowNames()).toEqual(['Bœuf bourguignon']);
  });

  it('does not reload a catalogue already in the store', async () => {
    const { catalogue } = await renderReorder([item('item-1', 'Bœuf bourguignon')]);

    expect(catalogue.loaded).toBe(false);
  });
});
