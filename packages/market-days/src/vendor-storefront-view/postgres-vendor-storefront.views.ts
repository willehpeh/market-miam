import { Queryable } from '@market-miam/event-sourcing';
import { VendorStorefrontView } from './vendor-storefront-view';
import { VendorStorefrontViews } from './vendor-storefront-views';
import { VendorStorefrontViewStore } from './vendor-storefront-view.store';

type Row = { name: string; description: string; phone: string; image_reference: string; published: boolean };

export class PostgresVendorStorefrontViews implements VendorStorefrontViews, VendorStorefrontViewStore {
  constructor(private readonly db: Queryable) {}

  async findByVendor(vendorId: string): Promise<VendorStorefrontView | undefined> {
    const { rows } = await this.db.query<Row>(
      'SELECT name, description, phone, image_reference, published FROM vendor_storefront_views WHERE vendor_id = $1',
      [vendorId],
    );
    const [row] = rows;
    return row
      ? { name: row.name, description: row.description, phone: row.phone, imageReference: row.image_reference, published: row.published }
      : undefined;
  }

  async open(vendorId: string): Promise<void> {
    await this.db.query(
      'INSERT INTO vendor_storefront_views (vendor_id) VALUES ($1) ON CONFLICT (vendor_id) DO NOTHING',
      [vendorId],
    );
  }

  async setCoverPhoto(vendorId: string, imageReference: string): Promise<void> {
    await this.db.query(
      `INSERT INTO vendor_storefront_views (vendor_id, image_reference) VALUES ($1, $2)
       ON CONFLICT (vendor_id) DO UPDATE SET image_reference = EXCLUDED.image_reference`,
      [vendorId, imageReference],
    );
  }

  async editInformation(vendorId: string, information: { name: string; description: string; phone: string }): Promise<void> {
    await this.db.query(
      `INSERT INTO vendor_storefront_views (vendor_id, name, description, phone) VALUES ($1, $2, $3, $4)
       ON CONFLICT (vendor_id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, phone = EXCLUDED.phone`,
      [vendorId, information.name, information.description, information.phone],
    );
  }

  async publish(vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO vendor_storefront_views (vendor_id, published) VALUES ($1, true)
       ON CONFLICT (vendor_id) DO UPDATE SET published = true`,
      [vendorId],
    );
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM vendor_storefront_views');
  }
}
