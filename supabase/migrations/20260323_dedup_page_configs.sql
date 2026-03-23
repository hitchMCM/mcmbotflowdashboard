-- Migration: Deduplicate page_configs and tighten the unique constraint
--
-- Root cause: the original UNIQUE(page_id, category, name) constraint allowed multiple
-- rows for the same page + category as long as the name differed.  The dashboard always
-- UPDATE'd the most-recently-created row, but n8n SQL queries without ORDER BY could
-- return an older row that still had ai_links = null.
--
-- Fix:
--   1. Remove duplicate rows — keep only the most-recently-updated row per (page_id, category)
--   2. Drop the old (page_id, category, name) unique constraint
--   3. Add a new UNIQUE(page_id, category) constraint

-- Step 1: Delete duplicate rows, keeping the one with the latest updated_at per (page_id, category)
DELETE FROM page_configs
WHERE id NOT IN (
  SELECT DISTINCT ON (page_id, category)
    id
  FROM page_configs
  ORDER BY page_id, category, updated_at DESC
);

-- Step 2: Drop old unique constraint (may have been created under different names)
ALTER TABLE page_configs DROP CONSTRAINT IF EXISTS page_configs_page_id_category_name_key;
ALTER TABLE page_configs DROP CONSTRAINT IF EXISTS page_configs_page_id_category_name;

-- Step 3: Add strict UNIQUE(page_id, category) — one config row per category per page
ALTER TABLE page_configs
  ADD CONSTRAINT page_configs_page_id_category_key UNIQUE (page_id, category);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
