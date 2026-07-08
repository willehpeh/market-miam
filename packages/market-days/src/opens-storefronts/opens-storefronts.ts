import { CheckpointedProcessor, CommandGateway, Processor, StoredEvent } from '@market-miam/event-sourcing';
import { vendorIdFrom } from '@market-miam/shared-kernel';
import { OpenStorefront } from '../open-storefront';

@CheckpointedProcessor('opens-storefronts')
export class OpensStorefronts implements Processor {
  constructor(private readonly commands: CommandGateway) {}

  async handle(event: StoredEvent): Promise<void> {
    await this.commands.execute(new OpenStorefront(vendorIdFrom(event)));
  }

  eventTypes(): string[] {
    return ['VendorRegistered'];
  }
}
