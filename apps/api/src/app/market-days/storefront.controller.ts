import { Body, Controller, Get, NotFoundException, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentVendor, JwtAuthGuard } from '@market-miam/auth-nestjs';
import type { VerifiedVendor } from '@market-miam/auth';
import { CommandGateway, QueryDispatcher } from '@market-miam/event-sourcing';
import {
  EditStorefrontInformation,
  FindVendorStorefront,
  SetStorefrontCoverPhoto,
  VendorStorefrontView,
} from '@market-miam/market-days';
import { SignedUpload, SignedUploads } from '../signed-uploads';

function coverPhotoPublicId(vendorId: string): string {
  return `storefronts/${vendorId}/cover-photo`;
}

@Controller('storefront')
export class StorefrontController {
  constructor(
    private readonly commands: CommandGateway,
    private readonly queries: QueryDispatcher,
    private readonly signedUploads: SignedUploads,
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
    @Body() body: { name: string; description: string; phone?: string },
  ): Promise<void> {
    await this.commands.execute(
      new EditStorefrontInformation(vendor.vendorId.value(), body.name, body.description, body.phone ?? ''),
    );
  }

  @Post('cover-photo/signature')
  @UseGuards(JwtAuthGuard)
  signCoverPhotoUpload(@CurrentVendor() vendor: VerifiedVendor): SignedUpload {
    return this.signedUploads.for(coverPhotoPublicId(vendor.vendorId.value()));
  }

  @Put('cover-photo')
  @UseGuards(JwtAuthGuard)
  async setCoverPhoto(
    @CurrentVendor() vendor: VerifiedVendor,
    @Body() body: { version: number },
  ): Promise<void> {
    const vendorId = vendor.vendorId.value();
    await this.commands.execute(
      new SetStorefrontCoverPhoto(vendorId, `v${body.version}/${coverPhotoPublicId(vendorId)}`),
    );
  }
}
