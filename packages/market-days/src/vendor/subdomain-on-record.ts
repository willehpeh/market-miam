import { Subdomain } from '../subdomain-registry/subdomain';

// What the vendor's stream says of their subdomain, held as the event recorded it: the shred
// turns it to SHREDDED, so it is never re-validated (ADR 0057, 0065).
export abstract class SubdomainOnRecord {
  abstract record(subdomain: Subdomain, proceed: () => void): void;
}

export class NoSubdomainOnRecord extends SubdomainOnRecord {
  record(_subdomain: Subdomain, proceed: () => void): void {
    proceed();
  }
}

export class RecordedSubdomain extends SubdomainOnRecord {
  constructor(private readonly recorded: string) {
    super();
  }

  // The same name again records nothing; another, the registry refuses.
  record(subdomain: Subdomain, proceed: () => void): void {
    if (subdomain.value() !== this.recorded) {
      proceed();
    }
  }
}
