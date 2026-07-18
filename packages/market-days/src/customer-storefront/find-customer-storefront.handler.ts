import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, Instant } from '@market-miam/common';
import { FindCustomerStorefront } from './find-customer-storefront';
import { CustomerStorefront, UpcomingMarket } from './customer-storefront';
import { SubdomainRegistry } from '../subdomain-registry/subdomain-registry';
import { VendorStorefrontViews } from '../vendor-storefront-view/vendor-storefront-views';
import { CatalogueViews } from '../catalogue-view/catalogue-views';
import { FindUpcomingMarketDays } from '../market-schedule-view/find-upcoming-market-days';
import { FindUpcomingMarketDaysHandler } from '../market-schedule-view/find-upcoming-market-days.handler';
import { MarketDayOccurrence } from '../market-schedule-view/upcoming-market-days-view';

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

  private async upcomingMarketsFor(vendorId: string): Promise<UpcomingMarket[]> {
    const { marketDays } = await this.upcoming.execute(new FindUpcomingMarketDays(vendorId));
    const now = this.parisWallClock(this.clock.now());
    return marketDays
      .filter(day => this.hasNotStarted(day, now))
      .slice(0, MAX_UPCOMING)
      .map(day => this.asUpcomingMarket(day));
  }

  private hasNotStarted(day: MarketDayOccurrence, now: string): boolean {
    return !day.startTime || `${day.date}T${day.startTime}` >= now;
  }

  // ponytail: Europe/Paris is the single-region calendar constant (plan §"Start-time cutoff");
  // becomes a Market timezone attribute when multi-region. h23 avoids the ICU 24:00 midnight quirk.
  private parisWallClock(now: Instant): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(now.value()));
    const at = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    return `${at('year')}-${at('month')}-${at('day')}T${at('hour')}:${at('minute')}`;
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
    };
  }
}
