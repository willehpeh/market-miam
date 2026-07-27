import { Injectable } from '@angular/core';
import { catchError, defer, Observable, of } from 'rxjs';
import {
  PASSTHROUGH_BYTES,
  PhotoDownscale,
  scaledSize,
  UPLOAD_JPEG_QUALITY,
} from './photo-downscale';

// ponytail: no spec. The decode/draw/encode path needs a real canvas, and the suite runs
// in jsdom, which has none. The size arithmetic is extracted into `scaledSize` and tested
// directly; what is left here is browser plumbing with a passthrough on every failure.
@Injectable()
export class CanvasPhotoDownscale implements PhotoDownscale {
  shrink(file: File): Observable<File> {
    if (file.size <= PASSTHROUGH_BYTES) {
      return of(file);
    }
    return defer(() => reencode(file)).pipe(catchError(() => of(file)));
  }
}

async function reencode(file: File): Promise<File> {
  // `from-image` is the spec default, but older engines defaulted to ignoring EXIF, and
  // baking in the wrong rotation is worse than sending the original. Asking explicitly is
  // the best we can do from here.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  try {
    const { width, height } = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await toJpeg(canvas);
    // A photo that gains weight on re-encode is one we should have left alone.
    if (blob === null || blob.size >= file.size) {
      return file;
    }
    return new File([blob], jpegName(file.name), { type: 'image/jpeg', lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}

function toJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', UPLOAD_JPEG_QUALITY));
}

function jpegName(name: string): string {
  return `${name.replace(/\.[^./\\]+$/, '')}.jpg`;
}
