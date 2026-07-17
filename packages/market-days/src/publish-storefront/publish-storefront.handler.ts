import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { PublishStorefront } from './publish-storefront';
import { StorefrontPublication } from './storefront-publication';
import { Storefronts } from '../storefront';
import { Catalogues } from '../catalogue';
import { Calendars } from '../calendar';

@CommandHandler(PublishStorefront)
export class PublishStorefrontHandler implements ICommandHandler<PublishStorefront> {
  constructor(
    private readonly storefronts: Storefronts,
    private readonly catalogues: Catalogues,
    private readonly calendars: Calendars,
    private readonly publication: StorefrontPublication,
  ) {}

  async execute(command: PublishStorefront): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const storefront = await this.storefronts.forVendor(vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    const calendar = await this.calendars.forVendor(vendorId);
    this.publication.publish(storefront, catalogue, calendar);
    await this.storefronts.save(storefront, vendorId);
  }
}
