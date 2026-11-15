import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { Merchants } from '../merchant';
import { PublishedStorefronts, StorefrontNotPublishedError } from '../published-storefronts';
import { StartPaymentAccountRegistration } from './start-payment-account-registration';

@CommandHandler(StartPaymentAccountRegistration)
export class StartPaymentAccountRegistrationHandler implements ICommandHandler<StartPaymentAccountRegistration> {
  constructor(
    private readonly merchants: Merchants,
    private readonly storefronts: PublishedStorefronts,
  ) {}

  async execute(request: StartPaymentAccountRegistration): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    if (!(await this.storefronts.include(vendorId))) {
      throw new StorefrontNotPublishedError();
    }
    const merchant = await this.merchants.forVendor(vendorId);
    merchant.startPaymentAccountRegistration(request.registrationId, request.accountToken, new Instant(request.startedAt));
    await this.merchants.save(merchant, vendorId);
  }
}
