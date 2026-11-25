export type OrderLine = {
  dishId: string;
  variant?: string;
  quantity: number;
  unitPrice: number;
};

export type HeldOrder = {
  orderId: string;
  marketId: string;
  date: string;
  lines: OrderLine[];
  paymentId: string;
};
