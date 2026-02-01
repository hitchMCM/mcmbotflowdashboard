-- =====================================================================================
-- Add 'keywords' column to messages table for Comment Reply functionality
-- Run this in psql: psql -U postgres -d MCMBotFlow -f this_file.sql
-- =====================================================================================

-- Add keywords column (array of text for trigger keywords)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Create index for faster keyword searches
CREATE INDEX IF NOT EXISTS idx_messages_keywords ON messages USING GIN(keywords);

-- Verify the change
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name = 'keywords';
