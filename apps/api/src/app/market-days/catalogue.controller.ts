import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { AddItemToCatalogue, CatalogueView, ChangeItemPhoto, FindVendorCatalogue, ReorderItems, RetireItem, ReviseItem } from '@market-miam/market-days';
import { CloudinarySignedUpload, SignedUploads } from '../signed-uploads';

function dishPhotoPublicId(vendorId: string, itemId: string): string {
  return `vendors/${vendorId}/dishes/${itemId}`;
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
  ): CloudinarySignedUpload {
    // ponytail: reuses the cover-photo eager rendition. Warms the wrong size for a dish
    // card, so the first paint may race Cloudinary. Add a dish eager transform once the
    // form lands and the card rendition is known.
    return this.signedUploads.for(dishPhotoPublicId(vendor.vendorId.value(), body.itemId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async add(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body() body: { itemId: string; name: string; description: string; price?: number; imageReference?: string; variants?: { name: string; description: string; price: number }[] },
  ): Promise<void> {
    await this.commands.execute(
      new AddItemToCatalogue({
        itemId: body.itemId,
        vendorId: vendor.vendorId.value(),
        name: body.name,
        description: body.description,
        price: body.price,
        imageReference: body.imageReference,
        variants: body.variants,
      }),
    );
  }

  // Declared above :itemId — Nest matches in declaration order, so the other way round
  // this arrives at revise() as a dish called "order".
  @Put('order')
  @UseGuards(JwtAuthGuard)
  async reorder(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body() body: { itemIds: string[] },
  ): Promise<void> {
    await this.commands.execute(new ReorderItems({ vendorId: vendor.vendorId.value(), itemIds: body.itemIds }));
  }

  @Put(':itemId')
  @UseGuards(JwtAuthGuard)
  async revise(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('itemId') itemId: string,
    @Body() body: { name: string; description: string; price?: number; variants?: { name: string; description: string; price: number }[] },
  ): Promise<void> {
    await this.commands.execute(
      new ReviseItem({
        itemId,
        vendorId: vendor.vendorId.value(),
        name: body.name,
        description: body.description,
        price: body.price,
        variants: body.variants,
      }),
    );
  }

  @Delete(':itemId')
  @UseGuards(JwtAuthGuard)
  async retire(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.commands.execute(new RetireItem(vendor.vendorId.value(), itemId));
  }

  @Put(':itemId/photo')
  @UseGuards(JwtAuthGuard)
  async changePhoto(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('itemId') itemId: string,
    @Body() body: { imageReference: string },
  ): Promise<void> {
    await this.commands.execute(
      new ChangeItemPhoto(itemId, vendor.vendorId.value(), body.imageReference),
    );
  }
}
