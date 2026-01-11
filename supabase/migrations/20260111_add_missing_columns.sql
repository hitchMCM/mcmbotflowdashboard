-- =====================================================================================
-- Migration: Add Missing Columns to Messages Table
-- Date: 2026-01-11
-- Description: Add keywords, delay_hours, and scheduled_at columns that are used in the app
-- =====================================================================================

-- Add keywords column for response messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add delay_hours column for sequence messages (different from default_delay_hours)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delay_hours INTEGER;

-- Add scheduled_at column for broadcast messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_messages_keywords ON messages USING GIN(keywords) WHERE category = 'response';
CREATE INDEX IF NOT EXISTS idx_messages_scheduled ON messages(scheduled_at) WHERE category = 'broadcast';

-- Comment on new columns
COMMENT ON COLUMN messages.keywords IS 'Trigger keywords for response messages';
COMMENT ON COLUMN messages.delay_hours IS 'Delay in hours before sending this message in a sequence';
COMMENT ON COLUMN messages.scheduled_at IS 'Scheduled date/time for broadcast messages';
