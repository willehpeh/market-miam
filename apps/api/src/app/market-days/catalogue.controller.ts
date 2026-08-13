import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import { AddItemToCatalogue, CatalogueView, ChangeItemPhoto, FindVendorCatalogue, ReorderItems, RetireItem, ReviseItem } from '@market-miam/market-days';
import { CloudinarySignedUpload, SignedUploads } from '../signed-uploads';
import { shapeOf } from '../shape-of.pipe';

// The `dishes` segment is the historical Cloudinary folder; existing uploads live under
// it, and moving new ones would split the media library across two folders for no reader.
function itemPhotoPublicId(vendorId: string, itemId: string): string {
  return `vendors/${vendorId}/dishes/${itemId}`;
}

const VariantBody = z.object({ name: z.string(), description: z.string(), price: z.number() });
const ItemBody = z.object({
  itemId: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number().optional(),
  imageReference: z.string().optional(),
  variants: z.array(VariantBody).optional(),
});
const RevisionBody = ItemBody.omit({ itemId: true, imageReference: true });
const ReorderBody = z.object({ itemIds: z.array(z.string()) });
const PhotoBody = z.object({ imageReference: z.string() });
const PhotoSignatureBody = z.object({ itemId: z.string() });

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
    @Body(shapeOf(PhotoSignatureBody)) body: z.infer<typeof PhotoSignatureBody>,
  ): CloudinarySignedUpload {
    // ponytail: reuses the cover-photo eager rendition. Warms the wrong size for an item
    // card, so the first paint may race Cloudinary. Add an item eager transform once the
    // form lands and the card rendition is known.
    return this.signedUploads.for(itemPhotoPublicId(vendor.vendorId.value(), body.itemId));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async add(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(ItemBody)) body: z.infer<typeof ItemBody>,
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
  // this arrives at revise() as an item called "order".
  @Put('order')
  @UseGuards(JwtAuthGuard)
  async reorder(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(ReorderBody)) body: z.infer<typeof ReorderBody>,
  ): Promise<void> {
    await this.commands.execute(new ReorderItems({ vendorId: vendor.vendorId.value(), itemIds: body.itemIds }));
  }

  @Put(':itemId')
  @UseGuards(JwtAuthGuard)
  async revise(
    @CurrentVendor() vendor: VerifiedVendor,
    @Param('itemId') itemId: string,
    @Body(shapeOf(RevisionBody)) body: z.infer<typeof RevisionBody>,
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
    @Body(shapeOf(PhotoBody)) body: z.infer<typeof PhotoBody>,
  ): Promise<void> {
    await this.commands.execute(
      new ChangeItemPhoto(itemId, vendor.vendorId.value(), body.imageReference),
    );
  }
}
