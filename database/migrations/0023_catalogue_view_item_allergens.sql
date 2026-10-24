-- Up Migration

-- The 14 allergens of INCO 1169/2011 an item declares, as a jsonb array of codes. NULL is
-- undeclared — an item added before allergens existed — and [] declares none of the 14.
-- Existing rows are already undeclared, so nothing is rebuilt.
ALTER TABLE catalogue_view_items ADD COLUMN allergens jsonb;

-- Down Migration

ALTER TABLE catalogue_view_items DROP COLUMN allergens;
