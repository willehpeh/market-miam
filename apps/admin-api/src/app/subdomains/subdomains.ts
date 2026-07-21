export abstract class Subdomains {
  abstract byVendor(): Promise<Map<string, string>>;
}
