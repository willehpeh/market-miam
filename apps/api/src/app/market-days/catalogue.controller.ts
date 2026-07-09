import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { AddItemToCatalogue, CatalogueView, FindVendorCatalogue } from '@market-miam/market-days';

@Controller('catalogue')
export class CatalogueController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryGateway,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentVendor() vendor: VerifiedVendor): Promise<CatalogueView> {
    return this.queries.execute(new FindVendorCatalogue(vendor.vendorId.value()));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async add(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body() body: { itemId: string; name: string; description: string; price: number; imageReference: string },
  ): Promise<void> {
    await this.commands.execute(
      new AddItemToCatalogue(
        body.itemId,
        vendor.vendorId.value(),
        body.name,
        body.description,
        body.price,
        body.imageReference,
      ),
    );
  }
}
