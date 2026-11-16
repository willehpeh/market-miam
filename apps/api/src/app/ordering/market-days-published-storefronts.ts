import { Injectable } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { IsStorefrontPublished } from '@market-miam/market-days';
import { PublishedStorefronts } from '@market-miam/ordering';
import { VendorId } from '@market-miam/shared-kernel';

@Injectable()
export class MarketDaysPublishedStorefronts extends PublishedStorefronts {
  constructor(private readonly queries: QueryGateway) {
    super();
  }

  include(vendorId: VendorId): Promise<boolean> {
    return this.queries.execute(new IsStorefrontPublished(vendorId.value()));
  }
}
