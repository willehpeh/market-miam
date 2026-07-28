import { Command } from '@nestjs/cqrs';

type ReorderItemsParams = {
  vendorId: string;
  itemIds: string[];
};

export class ReorderItems extends Command<void> {
  readonly vendorId: string;
  readonly itemIds: string[];

  constructor(params: ReorderItemsParams) {
    super();
    this.vendorId = params.vendorId;
    this.itemIds = params.itemIds;
  }
}
