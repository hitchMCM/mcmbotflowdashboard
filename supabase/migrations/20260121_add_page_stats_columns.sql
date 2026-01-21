-- Migration: Add statistics columns to pages table
-- These columns store aggregated statistics for dashboard display
-- Updated by the backend/webhook when messages are sent/delivered/read/clicked

-- Add statistics columns to pages table if they don't exist
DO $$
BEGIN
    -- total_sent: Total messages sent from this page
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages' AND column_name = 'total_sent') THEN
        ALTER TABLE pages ADD COLUMN total_sent INTEGER DEFAULT 0;
    END IF;

    -- total_delivered: Total messages delivered
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages' AND column_name = 'total_delivered') THEN
        ALTER TABLE pages ADD COLUMN total_delivered INTEGER DEFAULT 0;
    END IF;

    -- total_read: Total messages read
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages' AND column_name = 'total_read') THEN
        ALTER TABLE pages ADD COLUMN total_read INTEGER DEFAULT 0;
    END IF;

    -- total_clicks: Total button clicks
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages' AND column_name = 'total_clicks') THEN
        ALTER TABLE pages ADD COLUMN total_clicks INTEGER DEFAULT 0;
    END IF;

    -- total_subscribers: Total subscribers count (cached)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'pages' AND column_name = 'total_subscribers') THEN
        ALTER TABLE pages ADD COLUMN total_subscribers INTEGER DEFAULT 0;
    END IF;
END $$;

-- Initialize total_subscribers from actual subscriber count
UPDATE pages p
SET total_subscribers = (
    SELECT COUNT(*) 
    FROM subscribers s 
    WHERE s.page_id = p.id
);

-- Initialize totals from messages table (sum of all messages linked to this page via page_configs)
UPDATE pages p
SET 
    total_sent = COALESCE((
        SELECT SUM(m.sent_count)
        FROM messages m
        JOIN page_configs pc ON m.id = ANY(pc.selected_message_ids)
        WHERE pc.page_id = p.id
    ), 0),
    total_delivered = COALESCE((
        SELECT SUM(m.delivered_count)
        FROM messages m
        JOIN page_configs pc ON m.id = ANY(pc.selected_message_ids)
        WHERE pc.page_id = p.id
    ), 0),
    total_read = COALESCE((
        SELECT SUM(m.read_count)
        FROM messages m
        JOIN page_configs pc ON m.id = ANY(pc.selected_message_ids)
        WHERE pc.page_id = p.id
    ), 0),
    total_clicks = COALESCE((
        SELECT SUM(m.clicked_count)
        FROM messages m
        JOIN page_configs pc ON m.id = ANY(pc.selected_message_ids)
        WHERE pc.page_id = p.id
    ), 0);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pages_total_sent ON pages(total_sent);
CREATE INDEX IF NOT EXISTS idx_pages_total_subscribers ON pages(total_subscribers);

-- Add comment for documentation
COMMENT ON COLUMN pages.total_sent IS 'Aggregated count of messages sent from this page';
COMMENT ON COLUMN pages.total_delivered IS 'Aggregated count of messages delivered for this page';
COMMENT ON COLUMN pages.total_read IS 'Aggregated count of messages read for this page';
COMMENT ON COLUMN pages.total_clicks IS 'Aggregated count of button clicks for this page';
COMMENT ON COLUMN pages.total_subscribers IS 'Cached count of subscribers for this page';
