-- Up Migration

-- A dish can be sold as a set of variants instead of a single price. price becomes
-- nullable and variants (jsonb array of {name, description, price}) holds them. A row is
-- flat (price set, variants NULL) xor variant (price NULL, variants set).
ALTER TABLE catalogue_view_items ALTER COLUMN price DROP NOT NULL;
ALTER TABLE catalogue_view_items ADD COLUMN variants jsonb;

-- Down Migration

ALTER TABLE catalogue_view_items DROP COLUMN variants;
ALTER TABLE catalogue_view_items ALTER COLUMN price SET NOT NULL;
