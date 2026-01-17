-- Migration: Assign existing messages to first user
-- Date: 2026-01-16
-- Description: Update all existing messages without user_id to belong to the first (admin) user

-- Update all messages with null user_id to belong to the first user
UPDATE messages 
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;

-- Also update pages without user_id to belong to the first user
UPDATE pages 
SET user_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
WHERE user_id IS NULL;
