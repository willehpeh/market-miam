import { Queryable } from '@market-miam/event-sourcing';
import { CatalogueView, CatalogueViewItem } from './catalogue-view';
import { CatalogueViews } from './catalogue-views';
import { CatalogueViewStore } from './catalogue-view.store';

type Row = {
  item_id: string;
  name: string;
  description: string;
  price: number | null;
  image_reference: string;
  variants: { name: string; description: string; price: number }[] | null;
  allergens: string[] | null;
};

export class PostgresCatalogueViews implements CatalogueViews, CatalogueViewStore {
  constructor(private readonly db: Queryable) {}

  async forVendor(vendorId: string): Promise<CatalogueView> {
    const { rows } = await this.db.query<Row>(
      'SELECT item_id, name, description, price, image_reference, variants, allergens FROM catalogue_view_items WHERE vendor_id = $1 ORDER BY seq',
      [vendorId],
    );
    return {
      items: rows.map(row => row.variants
        ? { itemId: row.item_id, name: row.name, description: row.description, variants: row.variants, imageReference: row.image_reference, allergens: row.allergens }
        : { itemId: row.item_id, name: row.name, description: row.description, price: row.price ?? undefined, imageReference: row.image_reference, allergens: row.allergens }),
    };
  }

  async addItemToCatalogue(item: CatalogueViewItem, vendorId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO catalogue_view_items (vendor_id, item_id, name, description, price, image_reference, variants, allergens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (vendor_id, item_id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price,
         image_reference = EXCLUDED.image_reference, variants = EXCLUDED.variants, allergens = EXCLUDED.allergens`,
      [vendorId, item.itemId, item.name, item.description, item.price ?? null, item.imageReference, item.variants ? JSON.stringify(item.variants) : null, jsonOrNull(item.allergens)],
    );
  }

  async reviseItem(itemId: string, details: Pick<CatalogueViewItem, 'name' | 'description' | 'price' | 'variants' | 'allergens'>, vendorId: string): Promise<void> {
    await this.db.query(
      'UPDATE catalogue_view_items SET name = $3, description = $4, price = $5, variants = $6, allergens = $7 WHERE vendor_id = $1 AND item_id = $2',
      [vendorId, itemId, details.name, details.description, details.price ?? null, details.variants ? JSON.stringify(details.variants) : null, jsonOrNull(details.allergens)],
    );
  }

  async updateItemPhoto(itemId: string, imageReference: string, vendorId: string): Promise<void> {
    await this.db.query(
      'UPDATE catalogue_view_items SET image_reference = $3 WHERE vendor_id = $1 AND item_id = $2',
      [vendorId, itemId, imageReference],
    );
  }

  // Reordering redeals the vendor's own seq values: their existing seats, sorted, handed
  // out in the order given. Values stay distinct and below any future nextval, so an item
  // added later still lands last — and no column or migration is needed to hold a position.
  async reorderItems(itemIds: string[], vendorId: string): Promise<void> {
    await this.db.query(
      `WITH seats AS (
         SELECT seq, row_number() OVER (ORDER BY seq) AS position
         FROM catalogue_view_items WHERE vendor_id = $1
       ), wanted AS (
         SELECT item_id, ordinality AS position
         FROM unnest($2::text[]) WITH ORDINALITY AS listed(item_id, ordinality)
       )
       UPDATE catalogue_view_items AS item
       SET seq = seats.seq
       FROM wanted JOIN seats ON seats.position = wanted.position
       WHERE item.vendor_id = $1 AND item.item_id = wanted.item_id`,
      [vendorId, itemIds],
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

function jsonOrNull(allergens: string[] | null): string | null {
  return allergens === null ? null : JSON.stringify(allergens);
}
