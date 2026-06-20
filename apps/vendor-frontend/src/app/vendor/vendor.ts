import { Observable } from 'rxjs';

export abstract class Vendor {
  abstract register(): Observable<void>;
}
