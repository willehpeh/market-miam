import { Body, Controller, Get, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import {
  CloseMarketDay,
  FindMarketDay,
  FindUpcomingMarketDays,
  MarketDayOccurrence,
  MarkItemAsAvailable,
  MarkItemAsSoldOut,
  RecordItemOutcome,
  ReopenMarketDay,
  SetMarketDayMenu,
  UpcomingMarketDaysView
} from '@market-miam/market-days';
import { shapeOf } from '../shape-of.pipe';

const MenuBody = z.object({ itemIds: z.array(z.string()) });
const AvailabilityBody = z.object({ soldOut: z.boolean() });
const ClosedBody = z.object({ closed: z.boolean() });
// The three levels the event carries, gated at the edge (ADR 0046) so an unknown word is a
// 400 rather than a value the read model would have to learn to ignore.
const OutcomeBody = z.object({ outcome: z.enum(['sold_out', 'did_well', 'did_not_do_well']) });

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

  // Addressed by market and date rather than read out of the upcoming list: a closed day
  // stays the vendor's to look at, and the list only ever looks forward.
  @Get(':marketId/:date')
  @UseGuards(JwtAuthGuard)
  async marketDay(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('marketId') marketId: string,
    @Param('date') date: string,
  ): Promise<MarketDayOccurrence> {
    const day = await this.queries.execute(new FindMarketDay(vendor.vendorId.value(), marketId, date));
    if (!day) {
      throw new NotFoundException();
    }
    return day;
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

  // The availability pair's shape, for the same reasons: a vendor packing up on market
  // signal retries, and both directions of one flag read better as one route than as a
  // POST and a DELETE that would say *delete the market day* (decision 44).
  @Put(':marketId/:date/closed')
  @UseGuards(JwtAuthGuard)
  async setClosed(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('marketId') marketId: string,
    @Param('date') date: string,
    @Body(shapeOf(ClosedBody)) body: z.infer<typeof ClosedBody>,
  ): Promise<void> {
    const vendorId = vendor.vendorId.value();
    await this.commands.execute(body.closed
      ? new CloseMarketDay(vendorId, marketId, date)
      : new ReopenMarketDay(vendorId, marketId, date));
  }

  // One idempotent route behind both commands — a phone retrying on market wifi must be
  // safe, and re-stating the current state is a domain no-op (decisions 19 and 36), so
  // this breaks the one-route-one-command style knowingly.
  @Put(':marketId/:date/items/:itemId/availability')
  @UseGuards(JwtAuthGuard)
  async changeAvailability(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('marketId') marketId: string,
    @Param('date') date: string,
    @Param('itemId') itemId: string,
    @Body(shapeOf(AvailabilityBody)) body: z.infer<typeof AvailabilityBody>,
  ): Promise<void> {
    const vendorId = vendor.vendorId.value();
    await this.commands.execute(body.soldOut
      ? new MarkItemAsSoldOut(vendorId, itemId, marketId, date)
      : new MarkItemAsAvailable(vendorId, itemId, marketId, date));
  }

  // Per item and idempotent, the availability route's shape (decisions 19, 64): the bilan
  // is answered one dish at a time, so a tap that fails on bad signal fails alone, and a
  // retried answer is a domain no-op rather than a second event on the item's timeline.
  @Put(':marketId/:date/items/:itemId/outcome')
  @UseGuards(JwtAuthGuard)
  async recordOutcome(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('marketId') marketId: string,
    @Param('date') date: string,
    @Param('itemId') itemId: string,
    @Body(shapeOf(OutcomeBody)) body: z.infer<typeof OutcomeBody>,
  ): Promise<void> {
    await this.commands.execute(
      new RecordItemOutcome(vendor.vendorId.value(), itemId, marketId, date, body.outcome),
    );
  }
}
