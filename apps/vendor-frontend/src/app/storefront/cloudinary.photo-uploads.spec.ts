import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PhotoUploads, UploadedPhoto } from './photo-uploads';
import { CloudinaryPhotoUploads } from './cloudinary.photo-uploads';
import { SignedUpload } from './signed-upload';

const SIGNED: SignedUpload = {
  cloudName: 'test-cloud',
  apiKey: 'test-key',
  signature: 'sig-123',
  params: {
    timestamp: 1_700_000_000,
    public_id: 'vendors/acme/storefront/cover-photo',
    overwrite: true,
    invalidate: true,
    allowed_formats: 'jpg,png,webp',
    transformation: 'c_limit,w_2000',
    eager: 'c_fill,w_1200,h_600,q_auto,f_webp',
  },
};

describe('CloudinaryPhotoUploads', () => {
  let uploads: PhotoUploads;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PhotoUploads, useClass: CloudinaryPhotoUploads },
        provideHttpClientTesting(),
      ],
    });
    uploads = TestBed.inject(PhotoUploads);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpCtrl.verify());

  it('posts the signed form data to the account upload endpoint and maps the response', () => {
    const file = new File(['bytes'], 'stand.jpg', { type: 'image/jpeg' });
    let result: UploadedPhoto | undefined;

    uploads.upload(file, SIGNED).subscribe((r) => (result = r));

    const req = httpCtrl.expectOne('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('api_key')).toBe('test-key');
    expect(body.get('signature')).toBe('sig-123');
    expect(body.get('public_id')).toBe('vendors/acme/storefront/cover-photo');
    expect(body.get('timestamp')).toBe('1700000000');
    expect(body.get('overwrite')).toBe('true');
    expect(body.get('eager')).toBe('c_fill,w_1200,h_600,q_auto,f_webp');

    req.flush({
      public_id: 'vendors/acme/storefront/cover-photo',
      secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v42/vendors/acme/storefront/cover-photo.jpg',
      version: 42,
    });

    expect(result).toEqual({
      publicId: 'vendors/acme/storefront/cover-photo',
      secureUrl: 'https://res.cloudinary.com/test-cloud/image/upload/v42/vendors/acme/storefront/cover-photo.jpg',
      version: 42,
    });
  });
});
