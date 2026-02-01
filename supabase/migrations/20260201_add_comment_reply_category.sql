-- =====================================================================================
-- Add 'comment_reply' to messages and page_configs category constraints
-- Run this in Supabase SQL Editor
-- =====================================================================================

-- Fix messages table constraint
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_category_check;
ALTER TABLE messages ADD CONSTRAINT messages_category_check 
  CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard', 'comment_reply'));

-- Fix page_configs table constraint
ALTER TABLE page_configs DROP CONSTRAINT IF EXISTS page_configs_category_check;
ALTER TABLE page_configs ADD CONSTRAINT page_configs_category_check 
  CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard', 'comment_reply'));

-- Verify the changes
SELECT 'comment_reply category added to messages and page_configs' as status;
