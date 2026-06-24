import { Controller, Post, UseGuards } from '@nestjs/common';
import { Clock } from '@market-monster/common';
import { CurrentVendor, JwtAuthGuard } from '@market-monster/auth-nestjs';
import { VerifiedVendor } from '@market-monster/auth';
import { RegisterVendor } from '@market-monster/market-days';
import { CommandDispatcher } from './command-dispatcher';

@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly commands: CommandDispatcher,
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
