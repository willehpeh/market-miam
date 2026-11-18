import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Instant } from '@market-miam/common';
import { VendorId } from '@market-miam/shared-kernel';
import { Merchants } from '../merchant';
import { ObservePaymentAccount } from './observe-payment-account';

@CommandHandler(ObservePaymentAccount)
export class ObservePaymentAccountHandler implements ICommandHandler<ObservePaymentAccount> {
  constructor(private readonly merchants: Merchants) {}

  async execute(request: ObservePaymentAccount): Promise<void> {
    const vendorId = new VendorId(request.vendorId);
    const merchant = await this.merchants.forVendor(vendorId);
    merchant.observePaymentAccount(
      request.registrationId,
      request.accountId,
      request.cardPayments,
      new Instant(request.observedAt),
      request.informationDueBy,
    );
    await this.merchants.save(merchant, vendorId);
  }
}
