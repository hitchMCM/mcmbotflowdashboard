-- Migration: Add response delay and rate limiting columns to page_configs
-- delay_seconds: delay before sending a reply (in seconds), default 0
-- reset_period_hours: the period over which messages_count limit applies, default 24h

ALTER TABLE page_configs ADD COLUMN IF NOT EXISTS delay_seconds INT DEFAULT 0;
ALTER TABLE page_configs ADD COLUMN IF NOT EXISTS reset_period_hours INT DEFAULT 24;

-- Set existing response/comment_reply configs to unlimited replies (0)
UPDATE page_configs
SET messages_count = 0
WHERE category IN ('response', 'comment_reply')
  AND messages_count = 1;
