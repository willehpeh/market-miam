import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Catalogue, CatalogueItemView } from './catalogue';
import { HttpCatalogue } from './http.catalogue';
import { catalogueFeature } from './catalogue.state';
import { CatalogueEffects } from './catalogue.effects';
import { CatalogueFacade } from './catalogue.facade';
import { StoreCatalogueFacade } from './store.catalogue.facade';

const items: CatalogueItemView[] = [
  { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300, imageReference: 'v1/dishes/acme/item-1' },
];

describe('Catalogue', () => {
  let facade: CatalogueFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Catalogue, useClass: HttpCatalogue },
        provideStore(),
        provideState(catalogueFeature),
        provideEffects(CatalogueEffects),
        provideHttpClientTesting(),
        { provide: CatalogueFacade, useClass: StoreCatalogueFacade },
      ],
    });
    facade = TestBed.inject(CatalogueFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('requests the catalogue when asked to load', () => {
    facade.load();

    const req = httpCtrl.expectOne('/api/catalogue');
    expect(req.request.method).toBe('GET');
  });

  it('shows as loading until the catalogue arrives', () => {
    facade.load();

    httpCtrl.expectOne('/api/catalogue');
    expect(facade.loading()).toBe(true);
  });

  it('exposes the dishes once loaded', () => {
    facade.load();

    httpCtrl.expectOne('/api/catalogue').flush({ items });

    expect(facade.items()).toEqual(items);
    expect(facade.loading()).toBe(false);
  });

  it('stops loading and stays empty when the request fails', () => {
    facade.load();

    httpCtrl.expectOne('/api/catalogue').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.loading()).toBe(false);
    expect(facade.items()).toEqual([]);
  });
});
