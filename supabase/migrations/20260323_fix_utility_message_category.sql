-- Migration: Move utility messages from category='broadcast' to category='utility'
--
-- Utility messages were historically stored as category='broadcast' and identified
-- by messenger_payload._message_content.message_type = 'utility'.
-- This migration promotes them to their own proper category.

-- Update existing utility messages
UPDATE messages
SET category = 'utility'
WHERE category = 'broadcast'
  AND (messenger_payload->>'_message_content')::jsonb->>'message_type' = 'utility';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
