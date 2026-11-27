import { Injectable } from '@nestjs/common';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindVendorPublishingAt, IsStorefrontPublished } from '@market-miam/market-days';
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

  async vendorAt(subdomain: string): Promise<VendorId | undefined> {
    const vendorId = await this.queries.execute(new FindVendorPublishingAt(subdomain));
    return vendorId === undefined ? undefined : new VendorId(vendorId);
  }
}
