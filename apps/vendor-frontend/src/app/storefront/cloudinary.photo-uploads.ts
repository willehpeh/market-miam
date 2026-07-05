import { HttpBackend, HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { PhotoUploads, UploadedPhoto } from './photo-uploads';
import { SignedUpload } from './signed-upload';

interface CloudinaryUploadResponse {
  public_id: string;
  secure_url: string;
  version: number;
}

@Injectable()
export class CloudinaryPhotoUploads implements PhotoUploads {
  private readonly http = new HttpClient(inject(HttpBackend));

  upload(file: File, signed: SignedUpload): Observable<UploadedPhoto> {
    const form = new FormData();
    form.append('file', file);
    form.append('api_key', signed.apiKey);
    form.append('signature', signed.signature);
    Object.entries(signed.params).forEach(([key, value]) => form.append(key, String(value)));

    return this.http
      .post<CloudinaryUploadResponse>(
        `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
        form,
      )
      .pipe(
        map((response) => ({
          publicId: response.public_id,
          secureUrl: response.secure_url,
          version: response.version,
        })),
      );
  }
}
