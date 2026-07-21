import { Subdomains } from '../subdomains/subdomains';

export class FakeSubdomains extends Subdomains {
  constructor(private readonly entries: Array<[string, string]> = []) {
    super();
  }

  byVendor(): Promise<Map<string, string>> {
    return Promise.resolve(new Map(this.entries));
  }
}
