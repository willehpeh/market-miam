import { HeldOrder } from '../order';

export type CompletedPage = {
  vendorId: string;
  order: Omit<HeldOrder, 'accountId'>;
};

export class InMemoryPayments {
  private readonly completedPages = new Map<string, CompletedPage>();

  complete(sessionId: string, page: CompletedPage): void {
    this.completedPages.set(sessionId, page);
  }
}
