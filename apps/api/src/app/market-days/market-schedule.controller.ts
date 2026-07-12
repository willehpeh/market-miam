import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { CancelMarketSchedule, DeclareAbsence, FindVendorSchedules, MarketSchedulesView, RegisterMarketSchedule } from '@market-miam/market-days';

type MarketBody = {
  id: string;
  name: string;
  streetAddress?: string;
  codePostal: string;
  town: string;
  pitch?: string;
};

type ScheduleBody = {
  scheduleId: string;
  startDate: string;
  market: MarketBody;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency?: { weeks: number };
};

@Controller('market-schedules')
export class MarketScheduleController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryGateway,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentVendor() vendor: VerifiedVendor): Promise<MarketSchedulesView> {
    return this.queries.execute(new FindVendorSchedules(vendor.vendorId.value()));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async register(@CurrentVendor() vendor: VerifiedVendor, @Body() body: ScheduleBody): Promise<void> {
    await this.commands.execute(
      new RegisterMarketSchedule({ vendorId: vendor.vendorId.value(), ...body }),
    );
  }

  @Delete(':scheduleId')
  @UseGuards(JwtAuthGuard)
  async cancel(@CurrentVendor() vendor: VerifiedVendor, @Param('scheduleId') scheduleId: string): Promise<void> {
    await this.commands.execute(
      new CancelMarketSchedule({ vendorId: vendor.vendorId.value(), scheduleId }),
    );
  }

  @Post(':scheduleId/absences')
  @UseGuards(JwtAuthGuard)
  async declareAbsence(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('scheduleId') scheduleId: string,
    @Body() body: { from: string; to: string },
  ): Promise<void> {
    await this.commands.execute(
      new DeclareAbsence({ vendorId: vendor.vendorId.value(), scheduleId, ...body }),
    );
  }
}
