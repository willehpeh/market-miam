import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SellingRecord, SellingRecordView } from './selling-record';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpSellingRecord implements SellingRecord {
  private readonly http = inject(HttpClient);

  list(): Observable<SellingRecordView> {
    return this.http.get<SellingRecordView>(`${environment.apiBaseUrl}/api/selling-record`);
  }
}
