import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { AddItemToCatalogue, CatalogueView, FindVendorCatalogue } from '@market-miam/market-days';
import { SignedUpload, SignedUploads } from '../signed-uploads';

function dishPhotoPublicId(vendorId: string, itemId: string): string {
  return `dishes/${vendorId}/${itemId}`;
}

@Controller('catalogue')
export class CatalogueController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryGateway,
    private readonly signedUploads: SignedUploads,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentVendor() vendor: VerifiedVendor): Promise<CatalogueView> {
    return this.queries.execute(new FindVendorCatalogue(vendor.vendorId.value()));
  }

  @Post('photo/signature')
  @UseGuards(JwtAuthGuard)
  signPhotoUpload(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body() body: { itemId: string },
  ): SignedUpload {
    // ponytail: reuses the cover-photo eager rendition. Warms the wrong size for a dish
    // card, so the first paint may race Cloudinary. Add a dish eager transform once the
    // form lands and the card rendition is known.
    return this.signedUploads.for(dishPhotoPublicId(vendor.vendorId.value(), body.itemId));
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
