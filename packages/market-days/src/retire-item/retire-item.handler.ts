import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { VendorId } from '@market-miam/shared-kernel';
import { RetireItem } from './retire-item';
import { Catalogues, ItemId } from '../catalogue';

@CommandHandler(RetireItem)
export class RetireItemHandler implements ICommandHandler<RetireItem> {
  constructor(private readonly catalogues: Catalogues) {
  }

  async execute(command: RetireItem): Promise<void> {
    const vendorId = new VendorId(command.vendorId);
    const catalogue = await this.catalogues.forVendor(vendorId);
    catalogue.retireItem(new ItemId(command.itemId));
    await this.catalogues.save(catalogue, vendorId);
  }
}