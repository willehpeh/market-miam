import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { FindCustomerStorefront } from './find-customer-storefront';
import { CustomerStorefront, UpcomingMarket } from './customer-storefront';
import { SubdomainRegistry } from '../subdomain-registry';
import { VendorStorefrontViews } from '../vendor-storefront-view';
import { CatalogueViews } from '../catalogue-view';
import { FindUpcomingMarketDays, FindUpcomingMarketDaysHandler, MarketDayOccurrence } from '../market-schedule-view';

const MAX_UPCOMING = 5;

@QueryHandler(FindCustomerStorefront)
export class FindCustomerStorefrontHandler implements IQueryHandler<FindCustomerStorefront> {
  constructor(
    private readonly registry: SubdomainRegistry,
    private readonly storefronts: VendorStorefrontViews,
    private readonly catalogues: CatalogueViews,
    private readonly upcoming: FindUpcomingMarketDaysHandler,
  ) {}

  async execute(query: FindCustomerStorefront): Promise<CustomerStorefront | undefined> {
    const vendorId = await this.registry.vendorFor(query.subdomain);
    if (!vendorId) {
      return undefined;
    }
    const view = await this.storefronts.findByVendor(vendorId);
    if (!view || !view.published) {
      return { status: 'coming-soon', name: view?.name || null };
    }
    const catalogue = await this.catalogues.forVendor(vendorId);
    return {
      status: 'published',
      name: view.name,
      description: view.description,
      phone: view.phone,
      coverPhoto: view.imageReference || null,
      items: catalogue.items,
      cartePricesVisible: view.cartePricesVisible,
      upcomingMarkets: await this.upcomingMarketsFor(vendorId),
    };
  }

  // No end-of-day filter here: FindUpcomingMarketDays already drops days that have ended,
  // so what arrives is only what is still to come. Closed is the one temporal fact it does
  // not apply, because the vendor keeps the day to reopen it (decision 11) — the customer
  // reads it as over. Filtered before the cut, so a closed morning market does not cost
  // them their fifth day.
  private async upcomingMarketsFor(vendorId: string): Promise<UpcomingMarket[]> {
    const { marketDays } = await this.upcoming.execute(new FindUpcomingMarketDays(vendorId));
    return marketDays
      .filter(day => !day.closed)
      .slice(0, MAX_UPCOMING)
      .map(day => this.asUpcomingMarket(day));
  }

  private asUpcomingMarket(day: MarketDayOccurrence): UpcomingMarket {
    return {
      date: day.date,
      weekday: day.day,
      marketName: day.market.name,
      startTime: day.startTime,
      endTime: day.endTime,
      street: day.market.streetAddress,
      postalCode: day.market.codePostal,
      town: day.market.town,
      pitch: day.market.pitch,
      cancelled: day.absent,
      // Decision 56: the occurrence carries clock truth alone, so the absence guard this
      // field has always documented — never true for an absent day — lands here instead.
      inProgress: !day.absent && day.phase === 'trading',
      items: day.items,
      soldOutItemIds: day.soldOutItemIds,
    };
  }
}
