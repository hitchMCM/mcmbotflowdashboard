-- =====================================================================================
-- Migration: Utility Message Templates
-- Date: 2026-02-25
-- Description:
--   Add columns to the messages table to support Meta Utility Message Templates.
--   When a user creates a utility message, the dashboard submits it to Meta's
--   Graph API for approval. Meta returns a template ID and status which we store.
--
--   Flow: Dashboard → Backend → Meta API → Store template_id + status in DB
-- =====================================================================================

-- Add utility template columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_utility_message BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS utility_template_id TEXT;          -- Meta's template ID (e.g., "987654321")
ALTER TABLE messages ADD COLUMN IF NOT EXISTS utility_template_name TEXT;        -- Template name (e.g., "job_notification_feb_2026")
ALTER TABLE messages ADD COLUMN IF NOT EXISTS utility_template_status TEXT       -- Meta's approval status
    CHECK (utility_template_status IN ('PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED', NULL));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS utility_template_params JSONB;     -- Variable mappings (e.g., {"1": "{{Firstname}}", "2": "15"})
ALTER TABLE messages ADD COLUMN IF NOT EXISTS utility_template_language TEXT DEFAULT 'en';  -- Template language code
ALTER TABLE messages ADD COLUMN IF NOT EXISTS utility_rejection_reason TEXT;     -- Error message if rejected by Meta

-- Index for quick lookups of utility messages
CREATE INDEX IF NOT EXISTS idx_messages_utility ON messages(is_utility_message) WHERE is_utility_message = true;
CREATE INDEX IF NOT EXISTS idx_messages_utility_status ON messages(utility_template_status) WHERE is_utility_message = true;
