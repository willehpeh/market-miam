import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { QueryGateway } from '@market-miam/event-sourcing';
import { FindUpcomingMarketDays, UpcomingMarketDaysView } from '@market-miam/market-days';

// Market days are derived from the schedule, but what this returns is days and their
// menus, not schedules — so they get their own resource rather than hanging off
// /market-schedules, where writing a day's menu would have had nowhere natural to sit.
@Controller('market-days')
export class MarketDayController {
  constructor(private readonly queries: QueryGateway) {}

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  upcoming(@CurrentVendor() vendor: VerifiedVendor): Promise<UpcomingMarketDaysView> {
    return this.queries.execute(new FindUpcomingMarketDays(vendor.vendorId.value()));
  }
}
