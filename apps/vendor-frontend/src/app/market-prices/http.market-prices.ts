import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MarketPrices, PriceList, VendorMarketPricesView } from './market-prices';
import { environment } from '../../environments/environment';

@Injectable()
export class HttpMarketPrices implements MarketPrices {
  private readonly http = inject(HttpClient);

  list(): Observable<VendorMarketPricesView> {
    return this.http.get<VendorMarketPricesView>(`${environment.apiBaseUrl}/api/market-prices`);
  }

  set(marketId: string, prices: PriceList): Observable<void> {
    return this.http.put<void>(`${environment.apiBaseUrl}/api/market-prices/${marketId}`, { prices });
  }
}
