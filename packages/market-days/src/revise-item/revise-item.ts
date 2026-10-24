import { Command } from '@nestjs/cqrs';

type ReviseItemParams = {
  itemId: string;
  vendorId: string;
  name: string;
  description: string;
  price?: number;
  variants?: { name: string; description: string; price: number }[];
  allergens: string[];
};

export class ReviseItem extends Command<void> {
  readonly itemId: string;
  readonly vendorId: string;
  readonly name: string;
  readonly description: string;
  readonly price?: number;
  readonly variants?: { name: string; description: string; price: number }[];
  readonly allergens: string[];

  constructor(params: ReviseItemParams) {
    super();
    this.itemId = params.itemId;
    this.vendorId = params.vendorId;
    this.name = params.name;
    this.description = params.description;
    this.price = params.price;
    this.variants = params.variants;
    this.allergens = params.allergens;
  }
}
