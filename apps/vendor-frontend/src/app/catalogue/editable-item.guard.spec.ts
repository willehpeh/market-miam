import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AddItem } from './add-item';
import { CatalogueList } from './catalogue-list';
import { editableItem } from './editable-item.guard';
import { CatalogueFacade } from './catalogue.facade';
import { FakeCatalogueFacade } from './fake.catalogue.facade';
import { CatalogueItemView } from './catalogue';

const existing: CatalogueItemView = {
  itemId: 'item-1',
  name: 'Bœuf bourguignon',
  description: 'Mijoté maison',
  price: 1300,
  imageReference: 'v1/items/acme/item-1',
};

describe('editableItem guard', () => {
  let fake: FakeCatalogueFacade;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    fake = new FakeCatalogueFacade();
    // A realistic load: a cold store fills from the backend.
    fake.load = () => {
      fake.loaded = true;
      fake.items.set([existing]);
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'dashboard/catalogue', component: CatalogueList },
          { path: 'dashboard/catalogue/:itemId/edit', component: AddItem, canActivate: [editableItem] },
        ]),
        { provide: CatalogueFacade, useValue: fake },
      ],
    });
    harness = await RouterTestingHarness.create();
  });

  it('warms a cold store so a direct-nav edit prefills instead of adding', async () => {
    await harness.navigateByUrl('/dashboard/catalogue/item-1/edit', AddItem);
    harness.detectChanges();

    expect(TestBed.inject(Router).url).toBe('/dashboard/catalogue/item-1/edit');
    const form = harness.routeNativeElement!;
    expect(form.textContent).toContain('Modifier le plat');
    expect(form.querySelector('#name')).toHaveValue('Bœuf bourguignon');
  });

  it('bounces to the catalogue when the item is unknown', async () => {
    await harness.navigateByUrl('/dashboard/catalogue/ghost/edit');

    expect(TestBed.inject(Router).url).toBe('/dashboard/catalogue');
  });

  // "does not reload a warm store" used to live here. The screen now asks for the
  // catalogue itself, so this route can no longer observe who asked — and warm-only is
  // the facade's promise anyway, kept by catalogue.spec.ts's "does not ask again while
  // fresh". What is left of this guard goes with the next change.
  it('prefills from a store that is already warm', async () => {
    fake.items.set([existing]);

    await harness.navigateByUrl('/dashboard/catalogue/item-1/edit', AddItem);
    harness.detectChanges();

    expect(harness.routeNativeElement!.querySelector('#name')).toHaveValue('Bœuf bourguignon');
  });
});
