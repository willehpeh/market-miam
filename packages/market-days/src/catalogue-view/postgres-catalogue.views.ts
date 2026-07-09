import { Queryable } from '@market-miam/event-sourcing';
import { CatalogueView, CatalogueViewItem } from './catalogue-view';
import { CatalogueViews } from './catalogue-views';
import { CatalogueViewStore } from './catalogue-view.store';

type Row = { item_id: string; name: string; description: string; price: number; image_reference: string };

export class PostgresCatalogueViews implements CatalogueViews, CatalogueViewStore {
  constructor(private readonly db: Queryable) {}

  async forVendor(vendorId: string): Promise<CatalogueView> {
    const { rows } = await this.db.query<Row>(
      'SELECT item_id, name, description, price, image_reference FROM catalogue_view_items WHERE vendor_id = $1 ORDER BY seq',
      [vendorId],
    );
    return {
      items: rows.map(row => ({
        itemId: row.item_id,
        name: row.name,
        description: row.description,
        price: row.price,
        imageReference: row.image_reference,
      })),
    };
  }

  async addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO catalogue_view_items (vendor_id, item_id, name, description, price, image_reference)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (vendor_id, item_id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, image_reference = EXCLUDED.image_reference`,
      [vendorId, item.itemId, item.name, item.description, item.price, item.imageReference],
    );
  }

  async updateItemPrice(itemId: string, newPrice: number, vendorId: string): Promise<void> {
    await this.db.query(
      'UPDATE catalogue_view_items SET price = $3 WHERE vendor_id = $1 AND item_id = $2',
      [vendorId, itemId, newPrice],
    );
  }

  async retireItem(itemId: string, vendorId: string): Promise<void> {
    await this.db.query(
      'DELETE FROM catalogue_view_items WHERE vendor_id = $1 AND item_id = $2',
      [vendorId, itemId],
    );
  }

  async clear(): Promise<void> {
    await this.db.query('DELETE FROM catalogue_view_items');
  }
}
