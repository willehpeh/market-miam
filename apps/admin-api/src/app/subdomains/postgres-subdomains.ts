import { Pool } from 'pg';
import { requireEnv } from '../require-env';
import { Subdomains } from './subdomains';

export class PostgresSubdomains extends Subdomains {
  private readonly pool = new Pool({
    connectionString: requireEnv('DATABASE_CONNECTION_STRING'),
    // ponytail: local-only tool → the managed event store's external endpoint requires TLS;
    // skip CA verification rather than ship its cert. Add the CA if this ever runs untrusted.
    ssl: { rejectUnauthorized: false },
  });

  async byVendor(): Promise<Map<string, string>> {
    const { rows } = await this.pool.query<{ vendor_id: string; subdomain: string }>(
      'SELECT vendor_id, subdomain FROM subdomain_registry',
    );
    return new Map(rows.map((row) => [row.vendor_id, row.subdomain]));
  }
}
