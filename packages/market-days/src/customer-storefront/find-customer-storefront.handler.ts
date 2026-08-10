import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, LocalDateTime } from '@market-miam/common';
import { FindCustomerStorefront } from './find-customer-storefront';
import { CustomerStorefront, UpcomingMarket } from './customer-storefront';
import { SubdomainRegistry } from '../subdomain-registry';
import { VendorStorefrontViews } from '../vendor-storefront-view';
import { CatalogueViews } from '../catalogue-view';
import { FindUpcomingMarketDays, FindUpcomingMarketDaysHandler, hasStarted, MarketDayOccurrence, notYetEnded, parisWallClock } from '../market-schedule-view';

const MAX_UPCOMING = 5;

@QueryHandler(FindCustomerStorefront)
export class FindCustomerStorefrontHandler implements IQueryHandler<FindCustomerStorefront> {
  constructor(
    private readonly registry: SubdomainRegistry,
    private readonly storefronts: VendorStorefrontViews,
    private readonly catalogues: CatalogueViews,
    private readonly upcoming: FindUpcomingMarketDaysHandler,
    private readonly clock: Clock,
  ) {}

  async execute(query: FindCustomerStorefront): Promise<CustomerStorefront | undefined> {
    const vendorId = await this.registry.vendorFor(query.subdomain);
    if (!vendorId) return undefined;
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
      dishes: catalogue.items,
      upcomingMarkets: await this.upcomingMarketsFor(vendorId),
    };
  }

  // No end-of-day filter here: FindUpcomingMarketDays already drops days that have ended,
  // so what arrives is only what is still to come.
  private async upcomingMarketsFor(vendorId: string): Promise<UpcomingMarket[]> {
    const { marketDays } = await this.upcoming.execute(new FindUpcomingMarketDays(vendorId));
    const now = parisWallClock(this.clock.now());
    return marketDays.slice(0, MAX_UPCOMING).map(day => this.asUpcomingMarket(day, now));
  }

  private inProgress(day: MarketDayOccurrence, now: LocalDateTime): boolean {
    return !day.absent && hasStarted(day, now) && notYetEnded(day, now);
  }

  private asUpcomingMarket(day: MarketDayOccurrence, now: LocalDateTime): UpcomingMarket {
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
      inProgress: this.inProgress(day, now),
      dishes: day.dishes,
    };
  }
}
