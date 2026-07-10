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
    signature.flush(signedFor('dishes/acme/coq'));

    expect(facade.photoUploading()).toBe(false);
    expect(facade.newPhotoReference()).toBe('v1/dishes/acme/coq');
  });

  it('flags an error and stops uploading when signing fails', () => {
    facade.uploadDishPhoto('coq', anImage());

    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(null, serverError);

    expect(facade.photoUploading()).toBe(false);
    expect(facade.photoError()).toBe(true);
    expect(facade.newPhotoReference()).toBe('');
  });

  it('adds a dish, posting its cents price and photo reference, then clears the staged photo', () => {
    facade.uploadDishPhoto('coq', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('dishes/acme/coq'));

    facade.addDish({
      itemId: 'coq',
      name: 'Coq au vin',
      description: 'Mijoté au vin rouge',
      price: 1500,
      imageReference: 'v1/dishes/acme/coq',
    });

    const req = httpCtrl.expectOne('/api/catalogue');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      itemId: 'coq',
      name: 'Coq au vin',
      description: 'Mijoté au vin rouge',
      price: 1500,
      imageReference: 'v1/dishes/acme/coq',
    });
    req.flush(null);

    expect(facade.newPhotoReference()).toBe('');
  });
});
