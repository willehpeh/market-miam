import { CheckpointedProcessor, CommandDispatcher, Processor, StoredEvent } from '@market-monster/event-sourcing';
import { vendorIdFrom } from '@market-monster/shared-kernel';
import { OpenStorefront } from '../open-storefront';

@CheckpointedProcessor('storefront-opener')
export class StorefrontOpener implements Processor {
  constructor(private readonly commands: CommandDispatcher) {}

  async handle(event: StoredEvent): Promise<void> {
    await this.commands.execute(new OpenStorefront(vendorIdFrom(event)));
  }

  eventTypes(): string[] {
    return ['VendorRegistered'];
  }
}
