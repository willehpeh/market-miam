import { Controller, Post, UseGuards } from '@nestjs/common';
import { Clock } from '@market-miam/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway } from '@market-miam/event-sourcing';
import { RegisterVendor } from '@market-miam/market-days';

@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly clock: Clock,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async register(@CurrentVendor() vendor: VerifiedVendor): Promise<void> {
    await this.commands.execute(
      new RegisterVendor(
        vendor.vendorId.value(),
        this.clock.now().value(),
        vendor.email.value(),
      ),
    );
  }
}
