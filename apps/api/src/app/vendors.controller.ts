import { Controller, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Clock } from '@market-monster/common';
import { CurrentVendor, JwtAuthGuard } from '@market-monster/auth-nestjs';
import { VerifiedVendor } from '@market-monster/auth';
import { RegisterVendor } from '@market-monster/market-days';

@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly clock: Clock,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async register(@CurrentVendor() vendor: VerifiedVendor): Promise<void> {
    await this.commandBus.execute(
      new RegisterVendor(
        vendor.vendorId.value(),
        this.clock.now().value(),
        vendor.email.value(),
      ),
    );
  }
}
