import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway } from '@market-miam/event-sourcing';
import { RegisterMarketSchedule } from '@market-miam/market-days';

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
  scheduleName: string;
  startDate: string;
  market: MarketBody;
  days: { day: string; startTime?: string; endTime?: string }[];
  frequency?: { weeks: number };
};

@Controller('market-schedules')
export class MarketScheduleController {
  constructor(private readonly commands: CommandGateway) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async register(@CurrentVendor() vendor: VerifiedVendor, @Body() body: ScheduleBody): Promise<void> {
    await this.commands.execute(
      new RegisterMarketSchedule({ vendorId: vendor.vendorId.value(), ...body }),
    );
  }
}
