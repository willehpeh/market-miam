import { Command } from '@nestjs/cqrs';

export interface VariantInput {
  readonly name: string;
  readonly description: string;
  readonly price: number;
}

type AddItemToCatalogueParams = {
  itemId: string;
  vendorId: string;
  name: string;
  description: string;
  price?: number;
  imageReference?: string;
  variants?: VariantInput[];
};

export class AddItemToCatalogue extends Command<void> {
  readonly itemId: string;
  readonly vendorId: string;
  readonly name: string;
  readonly description: string;
  readonly price?: number;
  readonly imageReference?: string;
  readonly variants?: VariantInput[];

  constructor(params: AddItemToCatalogueParams) {
    super();
    this.itemId = params.itemId;
    this.vendorId = params.vendorId;
    this.name = params.name;
    this.description = params.description;
    this.price = params.price;
    this.imageReference = params.imageReference;
    this.variants = params.variants;
  }
}
