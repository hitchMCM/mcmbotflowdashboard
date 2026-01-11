-- =====================================================
-- MIGRATION: Multi-Page Support with Shared Message Pools
-- Date: 2026-01-06
-- Description: Transform system to support multiple Facebook pages
-- with global message pools for Welcome, Responses, Sequences, Broadcasts
-- =====================================================

-- =====================================================
-- 1. WELCOME_MESSAGES TABLE (Multi-message pool)
-- =====================================================

CREATE TABLE IF NOT EXISTS welcome_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    subtitle TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    buttons JSONB DEFAULT '[]'::jsonb,
    text_content TEXT DEFAULT '',
    message_type TEXT DEFAULT 'template' CHECK (message_type IN ('text', 'template')),
    is_enabled BOOLEAN DEFAULT true,
    weight INTEGER DEFAULT 1, -- For weighted random selection
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    is_global BOOLEAN DEFAULT true, -- Global = available for all pages
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_welcome_messages_enabled ON welcome_messages(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_welcome_messages_global ON welcome_messages(is_global) WHERE is_global = true;

-- =====================================================
-- 2. UPDATE RESPONSE_MESSAGES (Make global)
-- =====================================================

-- Add global flag to response_messages (no parent needed anymore)
ALTER TABLE response_messages 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;

-- Make response_id nullable since messages are now independent
ALTER TABLE response_messages 
ALTER COLUMN response_id DROP NOT NULL;

-- Index for global messages
CREATE INDEX IF NOT EXISTS idx_response_messages_global ON response_messages(is_global) WHERE is_global = true;

-- =====================================================
-- 3. UPDATE SEQUENCE_MESSAGES (Make global)
-- =====================================================

-- Add global flag and stats to sequence_messages
ALTER TABLE sequence_messages 
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

-- Index for global messages
CREATE INDEX IF NOT EXISTS idx_sequence_messages_global ON sequence_messages(is_global) WHERE is_global = true;

-- =====================================================
-- 4. UPDATE BROADCAST_MESSAGES (Already has weight)
-- =====================================================

-- Add global flag to broadcasts
ALTER TABLE broadcasts
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

ALTER TABLE broadcast_messages
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_broadcasts_global ON broadcasts(is_global) WHERE is_global = true;
CREATE INDEX IF NOT EXISTS idx_broadcast_messages_global ON broadcast_messages(is_global) WHERE is_global = true;

-- =====================================================
-- 5. PAGES TABLE - Enhanced
-- =====================================================

-- Ensure pages table exists with all needed columns
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fb_page_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    cover_url TEXT,
    access_token_encrypted TEXT,
    user_id TEXT NOT NULL DEFAULT 'default-user',
    is_active BOOLEAN DEFAULT true,
    subscribers_count INTEGER DEFAULT 0,
    active_flows_count INTEGER DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for active pages
CREATE INDEX IF NOT EXISTS idx_pages_active ON pages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pages_user ON pages(user_id);

-- =====================================================
-- 6. FUNCTIONS FOR RANDOM MESSAGE SELECTION
-- =====================================================

-- Get random welcome message (weighted)
CREATE OR REPLACE FUNCTION get_random_welcome_message()
RETURNS TABLE (
    id UUID,
    title TEXT,
    subtitle TEXT,
    image_url TEXT,
    buttons JSONB,
    text_content TEXT,
    message_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH weighted_messages AS (
        SELECT 
            wm.id,
            wm.title,
            wm.subtitle,
            wm.image_url,
            wm.buttons,
            wm.text_content,
            wm.message_type,
            wm.weight,
            random() * wm.weight as weighted_random
        FROM welcome_messages wm
        WHERE wm.is_enabled = true AND wm.is_global = true
    )
    SELECT 
        weighted_messages.id,
        weighted_messages.title,
        weighted_messages.subtitle,
        weighted_messages.image_url,
        weighted_messages.buttons,
        weighted_messages.text_content,
        weighted_messages.message_type
    FROM weighted_messages
    ORDER BY weighted_random DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get random response message (weighted, no parent needed)
CREATE OR REPLACE FUNCTION get_random_response_message()
RETURNS TABLE (
    id UUID,
    title TEXT,
    subtitle TEXT,
    image_url TEXT,
    buttons JSONB,
    text_content TEXT,
    message_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH weighted_messages AS (
        SELECT 
            rm.id,
            rm.title,
            rm.subtitle,
            rm.image_url,
            rm.buttons,
            rm.text_content,
            rm.message_type,
            rm.weight,
            random() * rm.weight as weighted_random
        FROM response_messages rm
        WHERE rm.is_enabled = true AND rm.is_global = true
    )
    SELECT 
        weighted_messages.id,
        weighted_messages.title,
        weighted_messages.subtitle,
        weighted_messages.image_url,
        weighted_messages.buttons,
        weighted_messages.text_content,
        weighted_messages.message_type
    FROM weighted_messages
    ORDER BY weighted_random DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Get random sequence message for specific day/order (weighted)
CREATE OR REPLACE FUNCTION get_random_sequence_message(p_day INTEGER, p_order INTEGER)
RETURNS TABLE (
    id UUID,
    title TEXT,
    subtitle TEXT,
    image_url TEXT,
    buttons JSONB,
    text_content TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH weighted_messages AS (
        SELECT 
            sm.id,
            sm.title,
            sm.subtitle,
            sm.image_url,
            sm.buttons,
            sm.text_content,
            COALESCE(sm.weight, 1) as weight,
            random() * COALESCE(sm.weight, 1) as weighted_random
        FROM sequence_messages sm
        WHERE sm.day = p_day 
          AND sm."order" = p_order
          AND sm.is_enabled = true 
          AND sm.is_global = true
    )
    SELECT 
        weighted_messages.id,
        weighted_messages.title,
        weighted_messages.subtitle,
        weighted_messages.image_url,
        weighted_messages.buttons,
        weighted_messages.text_content
    FROM weighted_messages
    ORDER BY weighted_random DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS FOR updated_at
-- =====================================================

DROP TRIGGER IF EXISTS update_welcome_messages_updated_at ON welcome_messages;
CREATE TRIGGER update_welcome_messages_updated_at
    BEFORE UPDATE ON welcome_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. PAGE_MESSAGE_STATS VIEW (Global stats per page)
-- =====================================================

CREATE OR REPLACE VIEW page_message_stats AS
SELECT 
    p.id as page_id,
    p.name as page_name,
    (SELECT COUNT(*) FROM welcome_messages WHERE is_enabled = true AND is_global = true) as available_welcome_messages,
    (SELECT COUNT(*) FROM response_messages WHERE is_enabled = true AND is_global = true) as available_response_messages,
    (SELECT COUNT(DISTINCT day, "order") FROM sequence_messages WHERE is_enabled = true AND is_global = true) as available_sequence_steps,
    (SELECT COUNT(*) FROM broadcasts WHERE is_enabled = true AND is_global = true) as available_broadcasts
FROM pages p
WHERE p.is_active = true;

-- =====================================================
-- 9. SEED DEFAULT PAGES (if none exist)
-- =====================================================

INSERT INTO pages (fb_page_id, name, avatar_url, is_active, user_id)
SELECT 
    '1234567890_default',
    'Default Page',
    'https://api.dicebear.com/7.x/shapes/svg?seed=default',
    true,
    'default-user'
WHERE NOT EXISTS (SELECT 1 FROM pages);

-- =====================================================
-- 10. MIGRATE EXISTING DATA
-- =====================================================

-- Migrate existing welcome_message to welcome_messages table
INSERT INTO welcome_messages (
    title, subtitle, image_url, buttons, text_content, message_type, is_enabled, weight, is_global
)
SELECT 
    COALESCE(title, 'Welcome!'),
    COALESCE(subtitle, ''),
    COALESCE(image_url, ''),
    COALESCE(buttons, '[]'::jsonb),
    COALESCE(text_content, ''),
    COALESCE(message_type, 'template'),
    COALESCE(is_enabled, true),
    1,
    true
FROM welcome_message
WHERE NOT EXISTS (SELECT 1 FROM welcome_messages)
LIMIT 1;

-- Mark all existing response_messages as global
UPDATE response_messages SET is_global = true WHERE is_global IS NULL;

-- Mark all existing sequence_messages as global
UPDATE sequence_messages SET is_global = true WHERE is_global IS NULL;

-- Mark all existing broadcasts as global
UPDATE broadcasts SET is_global = true WHERE is_global IS NULL;
UPDATE broadcast_messages SET is_global = true WHERE is_global IS NULL;

-- =====================================================
-- 11. COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE welcome_messages IS 'Pool of welcome messages - system randomly picks one when new subscriber joins';
COMMENT ON TABLE response_messages IS 'Pool of auto-response messages - system randomly picks one when triggered';
COMMENT ON TABLE sequence_messages IS 'Pool of sequence messages - system randomly picks one for each day/order combination';
COMMENT ON COLUMN welcome_messages.weight IS 'Higher weight = higher probability of being selected (1-10)';
COMMENT ON COLUMN welcome_messages.is_global IS 'If true, message is available for all pages';
COMMENT ON COLUMN response_messages.is_global IS 'If true, message is available for all pages';
COMMENT ON COLUMN sequence_messages.is_global IS 'If true, message is available for all pages';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
