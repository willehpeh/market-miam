import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-monster/auth-nestjs';
import { VerifiedVendor } from '@market-monster/auth';
import { CommandDispatcher } from '@market-monster/event-sourcing';
import { EditStorefrontInformation } from '@market-monster/market-days';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly commands: CommandDispatcher) {}

  @Put()
  @UseGuards(JwtAuthGuard)
  async edit(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body() body: { name: string; description: string },
  ): Promise<void> {
    await this.commands.execute(
      new EditStorefrontInformation(vendor.vendorId.value(), body.name, body.description),
    );
  }
}
