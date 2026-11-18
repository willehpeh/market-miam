import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { Merchants } from '../merchant';
import { ConfirmPaymentAccountRegistration } from './confirm-payment-account-registration';

@CommandHandler(ConfirmPaymentAccountRegistration)
export class ConfirmPaymentAccountRegistrationHandler implements ICommandHandler<ConfirmPaymentAccountRegistration> {
  constructor(private readonly merchants: Merchants) {}

  async execute(request: ConfirmPaymentAccountRegistration): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const merchant = await this.merchants.forVendor(vendorId);
    merchant.confirmPaymentAccountRegistration(request.registrationId, request.accountId, new Instant(request.confirmedAt));
    await this.merchants.save(merchant, vendorId);
  }
}
