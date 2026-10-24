import { Queryable } from '@market-miam/event-sourcing';
import { VendorLegalIdentityView } from './vendor-legal-identity-view';
import { VendorLegalIdentityViews } from './vendor-legal-identity-views';
import { VendorLegalIdentityViewStore } from './vendor-legal-identity-view.store';

export class PostgresVendorLegalIdentityViews implements VendorLegalIdentityViews, VendorLegalIdentityViewStore {
  constructor(private readonly db: Queryable) {}

  async findByVendor(vendorId: string): Promise<VendorLegalIdentityView | undefined> {
    const { rows } = await this.db.query<{ identity: VendorLegalIdentityView }>(
      'SELECT identity FROM vendor_legal_identity_views WHERE vendor_id = $1',
      [vendorId],
    );
    return rows[0]?.identity;
  }

  async provide(vendorId: string, identity: VendorLegalIdentityView): Promise<void> {
    await this.db.query(
      `INSERT INTO vendor_legal_identity_views (vendor_id, identity) VALUES ($1, $2)
       ON CONFLICT (vendor_id) DO UPDATE SET identity = EXCLUDED.identity`,
      [vendorId, identity],
    );
  }

  async remove(vendorId: string): Promise<void> {
    await this.db.query('DELETE FROM vendor_legal_identity_views WHERE vendor_id = $1', [vendorId]);
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM vendor_legal_identity_views');
  }
}
