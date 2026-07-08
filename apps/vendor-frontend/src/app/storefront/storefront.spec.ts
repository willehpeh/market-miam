import { TestBed } from '@angular/core/testing';
import { provideState, provideStore, Store } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Storefront } from './storefront';
import { HttpStorefront } from './http.storefront';
import { LoadStorefront, storefrontFeature } from './storefront.state';
import { StorefrontEffects, STOREFRONT_RETRY } from './storefront.effects';
import { StorefrontFacade } from './storefront.facade';
import { StoreStorefrontFacade } from './store.storefront.facade';
import { PhotoUploads } from './photo-uploads';
import { FakePhotoUploads } from './fake.photo-uploads';
import { SignedUpload } from './signed-upload';

const ACME = { name: 'Acme Bakery', description: 'Fresh bread daily', phone: '', imageReference: '' };

const notFound = { status: 404, statusText: 'Not Found' };

const serverError = { status: 500, statusText: 'Server Error' };

const SIGNED: SignedUpload = {
  cloudName: 'test-cloud',
  apiKey: 'test-key',
  signature: 'sig-123',
  params: {
    timestamp: 1_700_000_000,
    public_id: 'storefronts/acme/cover-photo',
    overwrite: true,
    invalidate: true,
    allowed_formats: 'jpg,png,webp',
    transformation: 'c_limit,w_2000',
    eager: 'c_fill,w_1200,h_600,q_auto,f_webp',
  },
};

const anImage = () => new File(['bytes'], 'stand.jpg', { type: 'image/jpeg' });

const macrotask = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('Storefront', () => {
  let store: Store;
  let facade: StorefrontFacade;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Storefront, useClass: HttpStorefront },
        { provide: PhotoUploads, useClass: FakePhotoUploads },
        provideStore(),
        provideState(storefrontFeature),
        provideEffects(StorefrontEffects),
        provideHttpClientTesting(),
        { provide: StorefrontFacade, useClass: StoreStorefrontFacade },
        { provide: STOREFRONT_RETRY, useValue: { delayMs: 0, maxAttempts: 1 } },
      ],
    });
    store = TestBed.inject(Store);
    facade = TestBed.inject(StorefrontFacade);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify();
  });

  it('requests the storefront view when asked to load', () => {
    store.dispatch(LoadStorefront());

    const req = httpCtrl.expectOne('/api/storefront');
    expect(req.request.method).toBe('GET');
  });

  it('shows as loading until the view arrives', () => {
    store.dispatch(LoadStorefront());

    httpCtrl.expectOne('/api/storefront');
    expect(facade.loading()).toBe(true);
  });

  it('exposes the view once loaded', () => {
    store.dispatch(LoadStorefront());

    httpCtrl.expectOne('/api/storefront').flush(ACME);

    expect(facade.view()).toEqual(ACME);
    expect(facade.loading()).toBe(false);
  });

  it('retries after a 404 and loads once the storefront is projected', async () => {
    store.dispatch(LoadStorefront());

    httpCtrl.expectOne('/api/storefront').flush(null, notFound);
    await macrotask();
    httpCtrl.expectOne('/api/storefront').flush(ACME);

    expect(facade.view()).toEqual(ACME);
    expect(facade.loading()).toBe(false);
  });

  it('gives up and reports no view once retries are exhausted', async () => {
    store.dispatch(LoadStorefront());

    httpCtrl.expectOne('/api/storefront').flush(null, notFound);
    await macrotask();
    httpCtrl.expectOne('/api/storefront').flush(null, notFound);

    expect(facade.loading()).toBe(false);
    expect(facade.view()).toBeUndefined();
  });

  it('stops loading without retrying on a non-404 error', () => {
    store.dispatch(LoadStorefront());

    httpCtrl.expectOne('/api/storefront').flush(null, { status: 500, statusText: 'Server Error' });

    expect(facade.loading()).toBe(false);
    expect(facade.view()).toBeUndefined();
  });

  it('sends the edited storefront information', () => {
    facade.save('La Table de Margaux', 'Cuisine de marché, mijotée maison.', '06 12 34 56 78');

    const req = httpCtrl.expectOne('/api/storefront');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché, mijotée maison.',
      phone: '06 12 34 56 78',
    });
    req.flush(null);
  });

  it('reflects the saved information optimistically without re-fetching, keeping the photo', () => {
    store.dispatch(LoadStorefront());
    httpCtrl.expectOne('/api/storefront').flush({ ...ACME, imageReference: 'v1/acme/cover' });

    facade.save('La Table de Margaux', 'Cuisine de marché', '06 12 34 56 78');
    httpCtrl.expectOne('/api/storefront').flush(null);

    expect(facade.view()).toEqual({
      name: 'La Table de Margaux',
      description: 'Cuisine de marché',
      phone: '06 12 34 56 78',
      imageReference: 'v1/acme/cover',
    });
    expect(facade.saved()).toBe(true);
  });

  it('uploads a cover photo by signing, uploading to Cloudinary, then persisting the reference', () => {
    store.dispatch(LoadStorefront());
    httpCtrl.expectOne('/api/storefront').flush(ACME);

    facade.uploadCoverPhoto(anImage());

    const signature = httpCtrl.expectOne('/api/storefront/cover-photo/signature');
    expect(signature.request.method).toBe('POST');
    expect(facade.coverPhotoUploading()).toBe(true);
    signature.flush(SIGNED);

    const persist = httpCtrl.expectOne('/api/storefront/cover-photo');
    expect(persist.request.method).toBe('PUT');
    expect(persist.request.body).toEqual({ version: 1 });
    persist.flush(null);

    expect(facade.coverPhotoUploading()).toBe(false);
    expect(facade.view()?.imageReference).toBe('v1/storefronts/acme/cover-photo');
  });

  it('flags an error and stops uploading when signing fails', () => {
    facade.uploadCoverPhoto(anImage());

    httpCtrl.expectOne('/api/storefront/cover-photo/signature').flush(null, serverError);

    expect(facade.coverPhotoUploading()).toBe(false);
    expect(facade.coverPhotoError()).toBe(true);
  });

  it('flags an error when persisting the uploaded reference fails', () => {
    facade.uploadCoverPhoto(anImage());

    httpCtrl.expectOne('/api/storefront/cover-photo/signature').flush(SIGNED);
    httpCtrl.expectOne('/api/storefront/cover-photo').flush(null, serverError);

    expect(facade.coverPhotoUploading()).toBe(false);
    expect(facade.coverPhotoError()).toBe(true);
  });
});
