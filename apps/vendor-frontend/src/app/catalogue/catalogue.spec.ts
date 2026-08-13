import { TestBed } from '@angular/core/testing';
import { waitFor } from '@testing-library/angular';
import { provideState, provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { provideRouter, Router } from '@angular/router';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Catalogue, CatalogueItemView } from './catalogue';
import { HttpCatalogue } from './http.catalogue';
import { catalogueFeature } from './catalogue.state';
import { CatalogueEffects } from './catalogue.effects';
import { CatalogueFacade } from './catalogue.facade';
import { StoreCatalogueFacade } from './store.catalogue.facade';
import { PhotoUploads } from '../storefront/photo-uploads';
import { FakePhotoUploads } from '../storefront/fake.photo-uploads';
import { MAX_SOURCE_BYTES, MAX_UPLOAD_BYTES, PhotoDownscale } from '../storefront/photo-downscale';
import { FakePhotoDownscale } from '../storefront/fake.photo-downscale';
import { SignedUpload } from '../storefront/signed-upload';

const items: CatalogueItemView[] = [
  { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300, imageReference: 'v1/items/acme/item-1' },
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

const ofSize = (bytes: number, name = 'plat.jpg') => {
  const file = new File(['x'], name, { type: 'image/jpeg' });
  Object.defineProperty(file, 'size', { value: bytes });
  return file;
};

describe('Catalogue', () => {
  let facade: CatalogueFacade;
  let httpCtrl: HttpTestingController;
  let uploads: FakePhotoUploads;
  let downscale: FakePhotoDownscale;

  beforeEach(() => {
    uploads = new FakePhotoUploads();
    downscale = new FakePhotoDownscale();
    TestBed.configureTestingModule({
      providers: [
        { provide: Catalogue, useClass: HttpCatalogue },
        { provide: PhotoUploads, useValue: uploads },
        { provide: PhotoDownscale, useValue: downscale },
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

  it('exposes the items once loaded', () => {
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

  it('uploads an item photo by signing for the item id, then exposes the versioned reference', () => {
    facade.uploadItemPhoto('coq', anImage());

    const signature = httpCtrl.expectOne('/api/catalogue/photo/signature');
    expect(signature.request.method).toBe('POST');
    expect(signature.request.body).toEqual({ itemId: 'coq' });
    expect(facade.photoUploading()).toBe(true);
    signature.flush(signedFor('vendors/acme/items/coq'));

    expect(facade.photoUploading()).toBe(false);
    expect(facade.newPhotoReference()).toBe('v1/vendors/acme/items/coq');
  });

  it('shrinks the photo first and uploads what came back, not the original', () => {
    const original = ofSize(9 * 1024 * 1024, 'original.jpg');
    const shrunk = ofSize(300 * 1024, 'original.jpg');
    downscale.returning(shrunk);

    facade.uploadItemPhoto('coq', original);

    expect(downscale.shrunk).toBe(original);
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/items/coq'));
    expect(uploads.uploaded).toBe(shrunk);
  });

  it('refuses a source too large to decode without signing anything', () => {
    facade.uploadItemPhoto('coq', ofSize(MAX_SOURCE_BYTES + 1, 'enorme.jpg'));

    httpCtrl.expectNone('/api/catalogue/photo/signature');
    expect(downscale.shrunk).toBeUndefined();
    expect(facade.photoTooLarge()).toBe(true);
    expect(facade.photoUploading()).toBe(false);
  });

  // A photo the browser cannot decode — an iPhone HEIC on Chrome, say — comes back from
  // the downscaler untouched, and may still be over what Cloudinary accepts.
  it('refuses a photo that is still too large once shrinking has had its go', () => {
    const undecodable = ofSize(MAX_UPLOAD_BYTES + 1, 'photo.heic');

    facade.uploadItemPhoto('coq', undecodable);

    httpCtrl.expectNone('/api/catalogue/photo/signature');
    expect(facade.photoTooLarge()).toBe(true);
    expect(facade.photoUploading()).toBe(false);
  });

  it('clears a refusal when the next photo is picked', () => {
    facade.uploadItemPhoto('coq', ofSize(MAX_SOURCE_BYTES + 1));
    expect(facade.photoTooLarge()).toBe(true);

    facade.uploadItemPhoto('coq', anImage());

    expect(facade.photoTooLarge()).toBe(false);
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/items/coq'));
  });

  it('flags an error and stops uploading when signing fails', () => {
    facade.uploadItemPhoto('coq', anImage());

    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(null, serverError);

    expect(facade.photoUploading()).toBe(false);
    expect(facade.photoError()).toBe(true);
    expect(facade.newPhotoReference()).toBe('');
  });

  it('persists an uploaded photo for an item already in the catalogue, then swaps it optimistically', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.uploadItemPhoto('item-1', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/items/item-1'));

    const put = httpCtrl.expectOne('/api/catalogue/item-1/photo');
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ imageReference: 'v1/vendors/acme/items/item-1' });
    put.flush(null);

    expect(facade.items()[0].imageReference).toBe('v1/vendors/acme/items/item-1');
  });

  it('does not persist an uploaded photo for an item not yet in the catalogue', () => {
    facade.uploadItemPhoto('coq', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/items/coq'));

    httpCtrl.expectNone('/api/catalogue/coq/photo');
    expect(facade.newPhotoReference()).toBe('v1/vendors/acme/items/coq');
  });

  it('adds an item, posting its cents price and photo reference, then clears the staged photo', () => {
    facade.uploadItemPhoto('coq', anImage());
    httpCtrl.expectOne('/api/catalogue/photo/signature').flush(signedFor('vendors/acme/items/coq'));

    facade.addItem({
      itemId: 'coq',
      name: 'Coq au vin',
      description: 'Mijoté au vin rouge',
      price: 1500,
      imageReference: 'v1/vendors/acme/items/coq',
    });

    const req = httpCtrl.expectOne('/api/catalogue');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      itemId: 'coq',
      name: 'Coq au vin',
      description: 'Mijoté au vin rouge',
      price: 1500,
      imageReference: 'v1/vendors/acme/items/coq',
    });
    req.flush(null);

    expect(facade.newPhotoReference()).toBe('');
  });

  it('shows the added item optimistically on success', () => {
    facade.addItem({ itemId: 'coq', name: 'Coq au vin', description: 'Mijoté', price: 1500, imageReference: 'v1/vendors/acme/items/coq' });

    httpCtrl.expectOne('/api/catalogue').flush(null);

    expect(facade.items()).toEqual([
      { itemId: 'coq', name: 'Coq au vin', description: 'Mijoté', price: 1500, imageReference: 'v1/vendors/acme/items/coq' },
    ]);
  });

  it('defaults the optimistic image reference to empty when there is no photo', () => {
    facade.addItem({ itemId: 'coq', name: 'Coq au vin', description: '', price: 1500 });

    httpCtrl.expectOne('/api/catalogue').flush(null);

    expect(facade.items()[0].imageReference).toBe('');
  });

  it('revises an item, putting its new fields to its item id', () => {
    facade.reviseItem({ itemId: 'item-1', name: 'Bœuf mode', description: 'Version express', price: 1400 });

    const req = httpCtrl.expectOne('/api/catalogue/item-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Bœuf mode', description: 'Version express', price: 1400 });
    req.flush(null);
  });

  it('replaces the item optimistically on success, keeping its image', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.reviseItem({ itemId: 'item-1', name: 'Bœuf mode', description: 'Version express', price: 1400 });
    httpCtrl.expectOne('/api/catalogue/item-1').flush(null);

    expect(facade.items()).toEqual([
      { itemId: 'item-1', name: 'Bœuf mode', description: 'Version express', price: 1400, imageReference: 'v1/items/acme/item-1' },
    ]);
  });

  it('reorders the items, putting the chosen order to the order route', () => {
    facade.reorderItems(['item-2', 'item-1']);

    const req = httpCtrl.expectOne('/api/catalogue/order');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ itemIds: ['item-2', 'item-1'] });
    req.flush(null);
  });

  it('reorders the items it holds on success', () => {
    const second = { itemId: 'item-2', name: 'Blanquette de veau', description: 'À l\'ancienne', price: 1100, imageReference: 'v1/items/acme/item-2' };
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items: [...items, second] });

    facade.reorderItems(['item-2', 'item-1']);
    httpCtrl.expectOne('/api/catalogue/order').flush(null);

    expect(facade.items()).toEqual([second, ...items]);
  });

  it('returns to the catalogue once the new order is saved', async () => {
    facade.reorderItems(['item-2', 'item-1']);
    httpCtrl.expectOne('/api/catalogue/order').flush(null);

    await waitFor(() => expect(TestBed.inject(Router).url).toBe('/dashboard/catalogue'));
  });

  it('retires an item, deleting it at its item id', () => {
    facade.retireItem('item-1');

    const req = httpCtrl.expectOne('/api/catalogue/item-1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('drops the retired item from the ones it holds on success', () => {
    const second = { itemId: 'item-2', name: 'Blanquette de veau', description: 'À l\'ancienne', price: 1100, imageReference: 'v1/items/acme/item-2' };
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items: [...items, second] });

    facade.retireItem('item-1');
    httpCtrl.expectOne('/api/catalogue/item-1').flush(null);

    expect(facade.items()).toEqual([second]);
  });

  it('keeps the item when the deletion fails', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.retireItem('item-1');
    httpCtrl.expectOne('/api/catalogue/item-1').flush('nope', serverError);

    expect(facade.items()).toEqual(items);
  });

  it('returns to the catalogue once the item is deleted', async () => {
    facade.retireItem('item-1');
    httpCtrl.expectOne('/api/catalogue/item-1').flush(null);

    await waitFor(() => expect(TestBed.inject(Router).url).toBe('/dashboard/catalogue'));
  });

  it('changes an item photo, putting the reference to its item id', () => {
    facade.changeItemPhoto('item-1', 'v3/items/acme/item-1');

    const req = httpCtrl.expectOne('/api/catalogue/item-1/photo');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ imageReference: 'v3/items/acme/item-1' });
    req.flush(null);
  });

  it('swaps the item image optimistically on success, keeping its other fields', () => {
    facade.load();
    httpCtrl.expectOne('/api/catalogue').flush({ items });

    facade.changeItemPhoto('item-1', 'v3/items/acme/item-1');
    httpCtrl.expectOne('/api/catalogue/item-1/photo').flush(null);

    expect(facade.items()).toEqual([
      { itemId: 'item-1', name: 'Bœuf bourguignon', description: 'Mijoté maison', price: 1300, imageReference: 'v3/items/acme/item-1' },
    ]);
  });
});
