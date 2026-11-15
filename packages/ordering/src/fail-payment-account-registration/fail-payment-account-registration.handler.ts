import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { Merchants } from '../merchant';
import { FailPaymentAccountRegistration } from './fail-payment-account-registration';

@CommandHandler(FailPaymentAccountRegistration)
export class FailPaymentAccountRegistrationHandler implements ICommandHandler<FailPaymentAccountRegistration> {
  constructor(private readonly merchants: Merchants) {}

  async execute(request: FailPaymentAccountRegistration): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const merchant = await this.merchants.forVendor(vendorId);
    merchant.failPaymentAccountRegistration(request.registrationId, new Instant(request.failedAt));
    await this.merchants.save(merchant, vendorId);
  }
}
