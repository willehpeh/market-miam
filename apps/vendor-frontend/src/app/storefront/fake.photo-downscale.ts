import { Observable, of } from 'rxjs';
import { PhotoDownscale } from './photo-downscale';

export class FakePhotoDownscale implements PhotoDownscale {
  shrunk: File | undefined;
  private result: File | undefined;

  /** Hands back `file` from the next shrink, standing in for a real re-encode. */
  returning(file: File): void {
    this.result = file;
  }

  shrink(file: File): Observable<File> {
    this.shrunk = file;
    return of(this.result ?? file);
  }
}
