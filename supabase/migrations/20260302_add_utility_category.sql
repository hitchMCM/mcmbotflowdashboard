-- =====================================================================================
-- Add 'utility' to messages and page_configs category constraints
-- Allows utility message sending configuration to be stored in page_configs
-- =====================================================================================

-- Fix messages table constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_category_check;
ALTER TABLE messages ADD CONSTRAINT messages_category_check 
  CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard', 'comment_reply', 'utility'));

-- Fix page_configs table constraint
ALTER TABLE page_configs DROP CONSTRAINT IF EXISTS page_configs_category_check;
ALTER TABLE page_configs ADD CONSTRAINT page_configs_category_check 
  CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard', 'comment_reply', 'utility'));

-- Verify the changes
SELECT 'utility category added to messages and page_configs' as status;
