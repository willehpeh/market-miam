import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { AmendMarketSchedule, CancelMarketSchedule, DeclareAbsence, FindVendorSchedules, MarketSchedulesView, RegisterMarketSchedule } from '@market-miam/market-days';
import { shapeOf } from '../shape-of.pipe';

const MarketBody = z.object({
  id: z.string(),
  name: z.string(),
  streetAddress: z.string().optional(),
  codePostal: z.string(),
  town: z.string(),
  pitch: z.string().optional(),
});

const ScheduleBody = z.object({
  scheduleId: z.string(),
  startDate: z.string(),
  market: MarketBody,
  days: z.array(z.object({ day: z.string(), startTime: z.string().optional(), endTime: z.string().optional() })),
  frequency: z.union([z.object({ weeks: z.number() }), z.literal('once')]).optional(),
});

const AmendBody = ScheduleBody.omit({ scheduleId: true });
const AbsenceBody = z.object({ from: z.string(), to: z.string() });

type ScheduleBody = z.infer<typeof ScheduleBody>;
type AmendBody = z.infer<typeof AmendBody>;

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
  async register(@CurrentVendor() vendor: VerifiedVendor, @Body(shapeOf(ScheduleBody)) body: ScheduleBody): Promise<void> {
    await this.commands.execute(
      new RegisterMarketSchedule({ vendorId: vendor.vendorId.value(), ...body }),
    );
  }

  @Put(':scheduleId')
  @UseGuards(JwtAuthGuard)
  async amend(@CurrentVendor() vendor: VerifiedVendor, @Param('scheduleId') scheduleId: string, @Body(shapeOf(AmendBody)) body: AmendBody): Promise<void> {
    await this.commands.execute(
      new AmendMarketSchedule({ vendorId: vendor.vendorId.value(), scheduleId, ...body }),
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
    @Body(shapeOf(AbsenceBody)) body: z.infer<typeof AbsenceBody>,
  ): Promise<void> {
    await this.commands.execute(
      new DeclareAbsence({ vendorId: vendor.vendorId.value(), scheduleId, ...body }),
    );
  }
}
