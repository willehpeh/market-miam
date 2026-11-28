import { BasketLine } from './basket-line';

export type OrderLine = BasketLine & {
  unitPrice: number;
};
