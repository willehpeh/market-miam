import { Queryable } from '@market-miam/event-sourcing';
import { SubdomainAssignment, SubdomainClaim, SubdomainRegistry } from './subdomain-registry';

type VendorRow = { vendor_id: string };
type SubdomainRow = { subdomain: string };
type AssignmentRow = { subdomain: string; vendor_id: string };

export class PostgresSubdomainRegistry implements SubdomainRegistry {
  constructor(private readonly db: Queryable) {}

  // ON CONFLICT DO NOTHING rather than a unique violation: inside the assignment's
  // transaction, a raised error would abort the transaction for every statement after it.
  async register(subdomain: string, vendorId: string): Promise<SubdomainClaim> {
    const name = subdomain.toLowerCase();
    const { rowCount } = await this.db.query(
      'INSERT INTO subdomain_registry (subdomain, vendor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [name, vendorId],
    );
    if (rowCount === 1) {
      return 'claimed';
    }
    // Refused by one of the two unique columns: the name, assigned to this vendor or another, or
    // else the vendor, who has another name.
    const assignedTo = await this.vendorFor(name);
    if (assignedTo === undefined) {
      return 'has-another';
    }
    return assignedTo === vendorId ? 'already-theirs' : 'taken';
  }

  async vendorFor(subdomain: string): Promise<string | undefined> {
    const { rows } = await this.db.query<VendorRow>(
      'SELECT vendor_id FROM subdomain_registry WHERE subdomain = $1',
      [subdomain.toLowerCase()],
    );
    return rows[0]?.vendor_id;
  }

  async subdomainFor(vendorId: string): Promise<string | undefined> {
    const { rows } = await this.db.query<SubdomainRow>(
      'SELECT subdomain FROM subdomain_registry WHERE vendor_id = $1',
      [vendorId],
    );
    return rows[0]?.subdomain;
  }

  async removeFor(vendorId: string): Promise<void> {
    await this.db.query('DELETE FROM subdomain_registry WHERE vendor_id = $1', [vendorId]);
  }

  async assignments(): Promise<SubdomainAssignment[]> {
    const { rows } = await this.db.query<AssignmentRow>(
      'SELECT subdomain, vendor_id FROM subdomain_registry ORDER BY subdomain',
    );
    return rows.map((row) => ({ subdomain: row.subdomain, vendorId: row.vendor_id }));
  }
}
