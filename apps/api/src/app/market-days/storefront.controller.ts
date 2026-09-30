import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, Put, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryGateway } from '@market-miam/event-sourcing';
import {
  EditStorefrontInformation,
  HideCartePrices,
  FindVendorStorefront,
  PublishStorefront,
  SetStorefrontCoverPhoto,
  ShowCartePrices,
  VendorStorefront,
} from '@market-miam/market-days';
import { CloudinarySignedUpload, SignedUploads } from '../signed-uploads';
import { shapeOf } from '../shape-of.pipe';

const InformationBody = z.object({ name: z.string(), description: z.string(), phone: z.string().optional() });
const CoverPhotoBody = z.object({ version: z.number() });
const CartePricesBody = z.object({ visible: z.boolean() });

function coverPhotoPublicId(vendorId: string): string {
  return `vendors/${vendorId}/storefront/cover-photo`;
}

@Controller('storefront')
export class StorefrontController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryGateway,
    private readonly signedUploads: SignedUploads,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async view(@CurrentVendor() vendor: VerifiedVendor): Promise<VendorStorefront> {
    const view = await this.queries.execute(new FindVendorStorefront(vendor.vendorId.value()));
    if (!view) throw new NotFoundException();
    return view;
  }

  @Post('publish')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async publish(@CurrentVendor() vendor: VerifiedVendor): Promise<void> {
    await this.commands.execute(new PublishStorefront(vendor.vendorId.value()));
  }

  @Put()
  @UseGuards(JwtAuthGuard)
  async edit(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(InformationBody)) body: z.infer<typeof InformationBody>,
  ): Promise<void> {
    await this.commands.execute(
      new EditStorefrontInformation(vendor.vendorId.value(), body.name, body.description, body.phone ?? ''),
    );
  }

  @Post('cover-photo/signature')
  @UseGuards(JwtAuthGuard)
  signCoverPhotoUpload(@CurrentVendor() vendor: VerifiedVendor): CloudinarySignedUpload {
    return this.signedUploads.for(coverPhotoPublicId(vendor.vendorId.value()));
  }

  @Put('cover-photo')
  @UseGuards(JwtAuthGuard)
  async setCoverPhoto(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(CoverPhotoBody)) body: z.infer<typeof CoverPhotoBody>,
  ): Promise<void> {
    const vendorId = vendor.vendorId.value();
    await this.commands.execute(
      new SetStorefrontCoverPhoto(vendorId, `v${body.version}/${coverPhotoPublicId(vendorId)}`),
    );
  }

  // One idempotent route behind both commands, the availability pair's shape
  // (market-day.controller.ts): a vendor flips a switch to state the choice they want,
  // and a re-statement is a domain no-op.
  @Put('carte-prices')
  @UseGuards(JwtAuthGuard)
  async setCartePriceVisibility(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body(shapeOf(CartePricesBody)) body: z.infer<typeof CartePricesBody>,
  ): Promise<void> {
    const vendorId = vendor.vendorId.value();
    await this.commands.execute(body.visible
      ? new ShowCartePrices(vendorId)
      : new HideCartePrices(vendorId));
  }
}
