-- Add AI response mode support to page_configs
-- Adds ai_prompt, ai_links, ai_images, use_ai_response columns
-- and extends the selection_mode check constraint to include 'ai'

-- 1. Extend the CHECK constraint on selection_mode to allow 'ai'
ALTER TABLE page_configs DROP CONSTRAINT IF EXISTS page_configs_selection_mode_check;
ALTER TABLE page_configs ADD CONSTRAINT page_configs_selection_mode_check
  CHECK (selection_mode IN ('random', 'fixed', 'ordered', 'ai'));

-- 2. Add new AI columns
ALTER TABLE page_configs
  ADD COLUMN IF NOT EXISTS ai_prompt TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_links TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_images TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_ai_response BOOLEAN DEFAULT FALSE;

-- 3. Sync use_ai_response for any existing rows already set to 'ai'
UPDATE page_configs SET use_ai_response = TRUE WHERE selection_mode = 'ai';

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMENT ON COLUMN page_configs.ai_prompt IS 'System prompt / instructions for AI-generated responses (used when selection_mode = ''ai'')';
COMMENT ON COLUMN page_configs.ai_links IS 'URLs the AI can reference or share in its replies';
COMMENT ON COLUMN page_configs.ai_images IS 'Image URLs the AI can suggest or attach in its replies';
COMMENT ON COLUMN page_configs.use_ai_response IS 'True when selection_mode is ''ai'' — convenience flag for n8n/backend';

