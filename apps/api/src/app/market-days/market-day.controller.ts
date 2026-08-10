import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { FindUpcomingMarketDays, SetMarketDayMenu, UpcomingMarketDaysView } from '@market-miam/market-days';
import { shapeOf } from '../shape-of.pipe';

const MenuBody = z.object({ itemIds: z.array(z.string()) });

// Market days are derived from the schedule, but what this returns is days and their
// menus, not schedules — so they get their own resource rather than hanging off
// /market-schedules, where writing a day's menu would have had nowhere natural to sit.
@Controller('market-days')
export class MarketDayController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryGateway,
  ) {}

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  upcoming(@CurrentVendor() vendor: VerifiedVendor): Promise<UpcomingMarketDaysView> {
    return this.queries.execute(new FindUpcomingMarketDays(vendor.vendorId.value()));
  }

  // The whole set every time — the menu is a set, so clearing a day is an empty itemIds
  // rather than a DELETE. Which days exist is the schedule's business, not this route's:
  // a menu for a market the vendor never attends is stored and simply never surfaces.
  @Put(':marketId/:date/menu')
  @UseGuards(JwtAuthGuard)
  async setMenu(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('marketId') marketId: string,
    @Param('date') date: string,
    @Body(shapeOf(MenuBody)) body: z.infer<typeof MenuBody>,
  ): Promise<void> {
    await this.commands.execute(
      new SetMarketDayMenu({ vendorId: vendor.vendorId.value(), itemIds: body.itemIds, marketId, date }),
    );
  }
}
