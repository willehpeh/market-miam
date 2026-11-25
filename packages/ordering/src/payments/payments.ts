import { HeldOrder } from '../order';

export type CompletedPage = {
  vendorId: string;
  order: HeldOrder;
};

export abstract class Payments {
  abstract completedPage(sessionId: string, accountId: string): Promise<CompletedPage>;
}
