-- Migration: Add user_id to messages table
-- Date: 2026-01-16
-- Description: Allow filtering messages by user

-- Add user_id column to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS user_id UUID;

-- Create index for faster user-based lookups
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);

-- Update existing messages to link to admin user (optional - can be updated manually)
-- UPDATE messages SET user_id = (SELECT id FROM users WHERE email = 'admin@mcm.com' LIMIT 1) WHERE user_id IS NULL;
