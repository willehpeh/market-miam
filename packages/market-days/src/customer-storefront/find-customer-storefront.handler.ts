import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Clock, Instant, LocalDate, LocalDateTime, LocalTime } from '@market-miam/common';
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
      .filter(day => this.notYetEnded(day, now))
      .slice(0, MAX_UPCOMING)
      .map(day => this.asUpcomingMarket(day, now));
  }

  // A market day serves customers until it ends, not until it starts — they want the
  // menu during the market. No endTime falls back to the end of the calendar day, and
  // no startTime to its beginning, so a day counts as started once its date arrives.
  private notYetEnded(day: MarketDayOccurrence, now: LocalDateTime): boolean {
    return now.isNotAfter(this.wallClockOn(day, day.endTime || '23:59'));
  }

  private inProgress(day: MarketDayOccurrence, now: LocalDateTime): boolean {
    const started = this.wallClockOn(day, day.startTime || '00:00').isNotAfter(now);
    return !day.absent && started && this.notYetEnded(day, now);
  }

  private wallClockOn(day: MarketDayOccurrence, time: string): LocalDateTime {
    return new LocalDateTime(new LocalDate(day.date), new LocalTime(time));
  }

  // ponytail: Europe/Paris is the single-region calendar constant (plan §"Start-time cutoff");
  // becomes a Market timezone attribute when multi-region. h23 avoids the ICU 24:00 midnight
  // quirk, which LocalTime rejects outright.
  private parisWallClock(now: Instant): LocalDateTime {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris', hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(now.value()));
    const at = (type: string) => parts.find(part => part.type === type)?.value ?? '';
    return new LocalDateTime(
      new LocalDate(`${at('year')}-${at('month')}-${at('day')}`),
      new LocalTime(`${at('hour')}:${at('minute')}`),
    );
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
