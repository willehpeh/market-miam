import { CompletedPage, Payments } from './payments';

export class InMemoryPayments extends Payments {
  private readonly completedPages = new Map<string, CompletedPage>();

  complete(sessionId: string, page: CompletedPage): void {
    this.completedPages.set(sessionId, page);
  }

  async completedPage(sessionId: string): Promise<CompletedPage | undefined> {
    return this.completedPages.get(sessionId);
  }
}
