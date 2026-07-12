import { TestBed } from '@angular/core/testing';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouter } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Catalogue, CatalogueItemView } from './catalogue';
import { HttpCatalogue } from './http.catalogue';
import { catalogueFeature } from './catalogue.state';
import { CatalogueEffects } from './catalogue.effects';
import { CatalogueFacade } from './catalogue.facade';
import { StoreCatalogueFacade } from './store.catalogue.facade';
import { PhotoUploads } from '../storefront/photo-uploads';
import { FakePhotoUploads } from '../storefront/fake.photo-uploads';
import { SignedUpload } from '../storefront/signed-upload';

const items: CatalogueItemView[] = [
  { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300, imageReference: 'v1/dishes/acme/item-1' },
];

const serverError = { status: 500, statusText: 'Server Error' };

const anImage = () => new File(['bytes'], 'plat.jpg', { type: 'image/jpeg' });

const signedFor = (publicId: string): SignedUpload => ({
  cloudName: 'test-cloud',
  apiKey: 'test-key',
  signature: `signed(${publicId})`,
  params: {
    timestamp: 1_700_000_000,
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    allowed_formats: 'jpg,png,webp',
    transformation: 'c_limit,w_2000',
    eager: 'c_fill,w_600,h_400,q_auto,f_webp',
  },
});

describe('Catalogue', () => {
  let facade: CatalogueFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Catalogue, useClass: HttpCatalogue },
        { provide: PhotoUploads, useClass: FakePhotoUploads },
        provideStore(),
        provideState(catalogueFeature),
        provideEffects(CatalogueEffects),
        provideHttpClientTesting(),
        provideRouter([{ path: 'dashboard/catalogue', children: [] }]),
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

  it('uploads a dish photo by signing for the item id, then exposes the versioned reference', () => {
    facade.uploadDishPhoto('coq', anImage());

    const signature = httpCtrl.expectOne('/api/catalogue/photo/signature');
    expect(signature.request.method).toBe('POST');
    expect(signature.request.body).toEqual({ itemId: 'coq' });
    expect(facade.photoUploading()).toBe(true);
    signature.flush(signedFor('vendors/acme/dishes/coq'));

    expect(facade.photoUploading()).toBe(false);
    expect(facade.newPhotoReference()).toBe('v1/vendors/acme/dishes/coq');
  });

  it('flags an error and stops uploading when signing fails', () => {
    facade.uploadDishPhoto('coq', anImage());

    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(null, serverError);

    expect(facade.photoUploading()).toBe(false);
    expect(facade.photoError()).toBe(true);
    expect(facade.newPhotoReference()).toBe('');
  });

  it('persists an uploaded photo for a dish already in the catalogue, then swaps it optimistically', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.uploadDishPhoto('item-1', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/dishes/item-1'));

    const put = httpCtrl.expectOne('/api/catalogue/item-1/photo');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ imageReference: 'v1/vendors/acme/dishes/item-1' });
    put.flush(null);

    expect(facade.items()[0].imageReference).toBe('v1/vendors/acme/dishes/item-1');
  });

  it('does not persist an uploaded photo for a dish not yet in the catalogue', () => {
    facade.uploadDishPhoto('coq', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/dishes/coq'));

    httpCtrl.expectNone('/api/catalogue/coq/photo');
    expect(facade.newPhotoReference()).toBe('v1/vendors/acme/dishes/coq');
  });

  it('adds a dish, posting its cents price and photo reference, then clears the staged photo', () => {
    facade.uploadDishPhoto('coq', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/dishes/coq'));

    facade.addDish({
      itemId: 'coq',
      name: 'Coq au vin',
      description: 'Mijoté au vin rouge',
      price: 1500,
      imageReference: 'v1/vendors/acme/dishes/coq',
    });

    const req = httpCtrl.expectOne('/api/catalogue');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      itemId: 'coq',
      name: 'Coq au vin',
      description: 'Mijoté au vin rouge',
      price: 1500,
      imageReference: 'v1/vendors/acme/dishes/coq',
    });
    req.flush(null);

    expect(facade.newPhotoReference()).toBe('');
  });

  it('shows the added dish optimistically on success', () => {
    facade.addDish({ itemId: 'coq', name: 'Coq au vin', description: 'Mijoté', price: 1500, imageReference: 'v1/vendors/acme/dishes/coq' });

    httpCtrl.expectOne('/api/catalogue').flush(null);

    expect(facade.items()).toEqual([
      { itemId: 'coq', name: 'Coq au vin', description: 'Mijoté', price: 1500, imageReference: 'v1/vendors/acme/dishes/coq' },
    ]);
  });

  it('defaults the optimistic image reference to empty when there is no photo', () => {
    facade.addDish({ itemId: 'coq', name: 'Coq au vin', description: '', price: 1500 });

    httpCtrl.expectOne('/api/catalogue').flush(null);

    expect(facade.items()[0].imageReference).toBe('');
  });

  it('revises a dish, putting its new fields to its item id', () => {
    facade.reviseDish({ itemId: 'item-1', name: 'Bœuf mode', description: 'Version express', price: 1400 });

    const req = httpCtrl.expectOne('/api/catalogue/item-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Bœuf mode', description: 'Version express', price: 1400 });
    req.flush(null);
  });

  it('replaces the dish optimistically on success, keeping its image', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.reviseDish({ itemId: 'item-1', name: 'Bœuf mode', description: 'Version express', price: 1400 });
    httpCtrl.expectOne('/api/catalogue/item-1').flush(null);

    expect(facade.items()).toEqual([
      { itemId: 'item-1', name: 'Bœuf mode', description: 'Version express', price: 1400, imageReference: 'v1/dishes/acme/item-1' },
    ]);
  });

  it('changes a dish photo, putting the reference to its item id', () => {
    facade.changeDishPhoto('item-1', 'v3/dishes/acme/item-1');

    const req = httpCtrl.expectOne('/api/catalogue/item-1/photo');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ imageReference: 'v3/dishes/acme/item-1' });
    req.flush(null);
  });

  it('swaps the dish image optimistically on success, keeping its other fields', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.changeDishPhoto('item-1', 'v3/dishes/acme/item-1');
    httpCtrl.expectOne('/api/catalogue/item-1/photo').flush(null);

    expect(facade.items()).toEqual([
      { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300, imageReference: 'v3/dishes/acme/item-1' },
    ]);
  });
});
