import { Body, Controller, Get, NotFoundException, Put, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-monster/auth-nestjs';
import { VerifiedVendor } from '@market-monster/auth';
import { CommandDispatcher, QueryDispatcher } from '@market-monster/event-sourcing';
import {
  EditStorefrontInformation,
  FindVendorStorefront,
  VendorStorefrontView,
} from '@market-monster/market-days';

@Controller('storefront')
export class StorefrontController {
  constructor(
    private readonly commands: CommandDispatcher,
    private readonly queries: QueryDispatcher,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async view(@CurrentVendor() vendor: VerifiedVendor): Promise<VendorStorefrontView> {
    const view = await this.queries.execute(new FindVendorStorefront(vendor.vendorId.value()));
    if (!view) throw new NotFoundException();
    return view;
  }

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
