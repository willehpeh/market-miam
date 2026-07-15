import { Queryable } from '@market-miam/event-sourcing';
import { SubdomainRegistry } from './subdomain-registry';

type Row = { vendor_id: string };

export class PostgresSubdomainRegistry implements SubdomainRegistry {
  constructor(private readonly db: Queryable) {}

  async vendorFor(subdomain: string): Promise<string | undefined> {
    const { rows } = await this.db.query<Row>(
      'SELECT vendor_id FROM subdomain_registry WHERE subdomain = $1',
      [subdomain.toLowerCase()],
    );
    return rows[0]?.vendor_id;
  }

  async removeFor(vendorId: string): Promise<void> {
    await this.db.query('DELETE FROM subdomain_registry WHERE vendor_id = $1', [vendorId]);
  }
}
