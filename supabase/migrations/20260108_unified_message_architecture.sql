-- =====================================================================================
-- Migration: Unified Message Architecture
-- Date: 2026-01-08
-- Description: 
--   Simplify the database by unifying all message types into a single `messages` table
--   and all page configurations into a single `page_configs` table.
--   
--   BEFORE: welcome_messages, response_messages, sequence_messages, broadcast_messages, 
--           standard_messages + 5 separate config tables
--   AFTER:  messages (global pool) + page_configs (per-page config)
-- =====================================================================================

-- =====================================================================================
-- PART 1: CREATE UNIFIED MESSAGES TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic info
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard')),
    
    -- Message content
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file', NULL)),
    buttons JSONB DEFAULT '[]'::jsonb,
    messenger_payload JSONB,
    
    -- For sequence messages
    day_number INTEGER,
    message_order INTEGER,
    default_delay_hours INTEGER DEFAULT 24,
    
    -- Selection & Status
    weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
    is_active BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT true,
    
    -- Statistics
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_category ON messages(category);
CREATE INDEX idx_messages_active ON messages(is_active) WHERE is_active = true;
CREATE INDEX idx_messages_global ON messages(is_global) WHERE is_global = true;
CREATE INDEX idx_messages_sequence ON messages(day_number, message_order) WHERE category = 'sequence';

-- =====================================================================================
-- PART 2: CREATE UNIFIED PAGE_CONFIGS TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS page_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Page reference
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    
    -- Config identification
    category TEXT NOT NULL CHECK (category IN ('welcome', 'response', 'sequence', 'broadcast', 'standard')),
    name TEXT NOT NULL, -- e.g., "Job Response", "Daily Promo", "Onboarding Sequence"
    
    -- Message selection
    selected_message_ids UUID[] DEFAULT '{}',  -- Array of message IDs from pool
    selection_mode TEXT DEFAULT 'random' CHECK (selection_mode IN ('random', 'fixed', 'ordered')),
    fixed_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,  -- If mode is 'fixed'
    
    -- How many messages to send (for sequences/broadcasts that send multiple)
    messages_count INTEGER DEFAULT 1,
    
    -- Timing (for sequences)
    delay_hours INTEGER[] DEFAULT '{}',  -- Array of delays for each message in sequence
    
    -- Timing (for broadcasts)
    scheduled_time TIME,
    scheduled_date DATE,
    
    -- Keywords (for responses)
    trigger_keywords TEXT[] DEFAULT '{}',
    
    -- Status
    is_enabled BOOLEAN DEFAULT true,
    
    -- Statistics
    times_triggered INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique config per page/category/name
    UNIQUE(page_id, category, name)
);

-- Indexes
CREATE INDEX idx_page_configs_page ON page_configs(page_id);
CREATE INDEX idx_page_configs_category ON page_configs(category);
CREATE INDEX idx_page_configs_enabled ON page_configs(is_enabled) WHERE is_enabled = true;

-- =====================================================================================
-- PART 3: FUNCTIONS FOR MESSAGE SELECTION
-- =====================================================================================

-- Function: Get message for a page config
-- Respects selection_mode: random, fixed, or ordered
CREATE OR REPLACE FUNCTION get_config_message(p_config_id UUID, p_position INTEGER DEFAULT 1)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    buttons JSONB
) AS $$
DECLARE
    v_config RECORD;
    v_message_ids UUID[];
BEGIN
    -- Get config
    SELECT * INTO v_config FROM page_configs WHERE page_configs.id = p_config_id;
    
    IF v_config IS NULL THEN
        RETURN;
    END IF;
    
    -- FIXED mode: return specific message
    IF v_config.selection_mode = 'fixed' AND v_config.fixed_message_id IS NOT NULL THEN
        RETURN QUERY
        SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
        FROM messages m
        WHERE m.id = v_config.fixed_message_id AND m.is_active = true;
        RETURN;
    END IF;
    
    -- Get selected message IDs
    v_message_ids := v_config.selected_message_ids;
    
    IF array_length(v_message_ids, 1) IS NULL OR array_length(v_message_ids, 1) = 0 THEN
        -- No messages selected, get from global pool by category
        RETURN QUERY
        SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
        FROM messages m
        WHERE m.category = v_config.category AND m.is_active = true AND m.is_global = true
        ORDER BY RANDOM() * m.weight DESC
        LIMIT 1;
        RETURN;
    END IF;
    
    -- ORDERED mode: return message at position
    IF v_config.selection_mode = 'ordered' THEN
        IF p_position <= array_length(v_message_ids, 1) THEN
            RETURN QUERY
            SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
            FROM messages m
            WHERE m.id = v_message_ids[p_position] AND m.is_active = true;
        END IF;
        RETURN;
    END IF;
    
    -- RANDOM mode (default): weighted random from selected messages
    RETURN QUERY
    SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
    FROM messages m
    WHERE m.id = ANY(v_message_ids) AND m.is_active = true
    ORDER BY RANDOM() * m.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get welcome message for a page
CREATE OR REPLACE FUNCTION get_page_welcome(p_page_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    buttons JSONB
) AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Find welcome config for this page
    SELECT pc.id INTO v_config_id
    FROM page_configs pc
    WHERE pc.page_id = p_page_id 
      AND pc.category = 'welcome' 
      AND pc.is_enabled = true
    LIMIT 1;
    
    IF v_config_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM get_config_message(v_config_id);
        RETURN;
    END IF;
    
    -- No config, get random from global pool
    RETURN QUERY
    SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
    FROM messages m
    WHERE m.category = 'welcome' AND m.is_active = true AND m.is_global = true
    ORDER BY RANDOM() * m.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get response message for a page and keyword
CREATE OR REPLACE FUNCTION get_page_response(p_page_id UUID, p_keyword TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    buttons JSONB
) AS $$
DECLARE
    v_config_id UUID;
    v_normalized_keyword TEXT;
BEGIN
    v_normalized_keyword := LOWER(TRIM(p_keyword));
    
    -- Find response config for this page/keyword
    SELECT pc.id INTO v_config_id
    FROM page_configs pc
    WHERE pc.page_id = p_page_id 
      AND pc.category = 'response' 
      AND pc.is_enabled = true
      AND v_normalized_keyword = ANY(pc.trigger_keywords)
    LIMIT 1;
    
    IF v_config_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM get_config_message(v_config_id);
        RETURN;
    END IF;
    
    -- No config found
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function: Get sequence message for a page/day/order
CREATE OR REPLACE FUNCTION get_page_sequence(p_page_id UUID, p_day INTEGER, p_order INTEGER)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    buttons JSONB,
    delay_hours INTEGER
) AS $$
DECLARE
    v_config RECORD;
    v_message RECORD;
    v_delay INTEGER;
BEGIN
    -- Find sequence config for this page
    SELECT * INTO v_config
    FROM page_configs pc
    WHERE pc.page_id = p_page_id 
      AND pc.category = 'sequence' 
      AND pc.is_enabled = true
    LIMIT 1;
    
    IF v_config IS NOT NULL THEN
        -- Get message at position
        SELECT * INTO v_message FROM get_config_message(v_config.id, ((p_day - 1) * 10 + p_order));
        
        -- Get delay from config array (if exists)
        IF v_config.delay_hours IS NOT NULL AND array_length(v_config.delay_hours, 1) >= ((p_day - 1) * 10 + p_order) THEN
            v_delay := v_config.delay_hours[((p_day - 1) * 10 + p_order)];
        ELSE
            v_delay := 24; -- Default delay
        END IF;
        
        IF v_message.id IS NOT NULL THEN
            RETURN QUERY
            SELECT v_message.id, v_message.name, v_message.title, v_message.subtitle, 
                   v_message.text_content, v_message.image_url, v_message.buttons, v_delay;
            RETURN;
        END IF;
    END IF;
    
    -- No config, get from global sequence messages
    RETURN QUERY
    SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons, 
           COALESCE(m.default_delay_hours, 24)
    FROM messages m
    WHERE m.category = 'sequence' 
      AND m.day_number = p_day 
      AND m.message_order = p_order
      AND m.is_active = true 
      AND m.is_global = true
    ORDER BY RANDOM() * m.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get broadcast message for a page
CREATE OR REPLACE FUNCTION get_page_broadcast(p_page_id UUID, p_config_name TEXT DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    buttons JSONB
) AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Find broadcast config for this page
    SELECT pc.id INTO v_config_id
    FROM page_configs pc
    WHERE pc.page_id = p_page_id 
      AND pc.category = 'broadcast' 
      AND pc.is_enabled = true
      AND (p_config_name IS NULL OR pc.name = p_config_name)
    LIMIT 1;
    
    IF v_config_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM get_config_message(v_config_id);
        RETURN;
    END IF;
    
    -- No config, get random from global pool
    RETURN QUERY
    SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
    FROM messages m
    WHERE m.category = 'broadcast' AND m.is_active = true AND m.is_global = true
    ORDER BY RANDOM() * m.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: Get standard message for a page
CREATE OR REPLACE FUNCTION get_page_standard(p_page_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    title TEXT,
    subtitle TEXT,
    text_content TEXT,
    image_url TEXT,
    buttons JSONB
) AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Find standard config for this page
    SELECT pc.id INTO v_config_id
    FROM page_configs pc
    WHERE pc.page_id = p_page_id 
      AND pc.category = 'standard' 
      AND pc.is_enabled = true
    LIMIT 1;
    
    IF v_config_id IS NOT NULL THEN
        RETURN QUERY SELECT * FROM get_config_message(v_config_id);
        RETURN;
    END IF;
    
    -- No config, get random from global pool
    RETURN QUERY
    SELECT m.id, m.name, m.title, m.subtitle, m.text_content, m.image_url, m.buttons
    FROM messages m
    WHERE m.category = 'standard' AND m.is_active = true AND m.is_global = true
    ORDER BY RANDOM() * m.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 4: HELPER FUNCTIONS FOR CONFIGURATION
-- =====================================================================================

-- Function: Create or update page config
CREATE OR REPLACE FUNCTION upsert_page_config(
    p_page_id UUID,
    p_category TEXT,
    p_name TEXT,
    p_selected_message_ids UUID[] DEFAULT NULL,
    p_selection_mode TEXT DEFAULT 'random',
    p_fixed_message_id UUID DEFAULT NULL,
    p_trigger_keywords TEXT[] DEFAULT NULL,
    p_delay_hours INTEGER[] DEFAULT NULL,
    p_scheduled_time TIME DEFAULT NULL,
    p_messages_count INTEGER DEFAULT 1,
    p_is_enabled BOOLEAN DEFAULT true
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    INSERT INTO page_configs (
        page_id, category, name, selected_message_ids, selection_mode, 
        fixed_message_id, trigger_keywords, delay_hours, scheduled_time,
        messages_count, is_enabled
    )
    VALUES (
        p_page_id, p_category, p_name, COALESCE(p_selected_message_ids, '{}'),
        p_selection_mode, p_fixed_message_id, COALESCE(p_trigger_keywords, '{}'),
        COALESCE(p_delay_hours, '{}'), p_scheduled_time, p_messages_count, p_is_enabled
    )
    ON CONFLICT (page_id, category, name) 
    DO UPDATE SET
        selected_message_ids = COALESCE(EXCLUDED.selected_message_ids, page_configs.selected_message_ids),
        selection_mode = EXCLUDED.selection_mode,
        fixed_message_id = EXCLUDED.fixed_message_id,
        trigger_keywords = COALESCE(EXCLUDED.trigger_keywords, page_configs.trigger_keywords),
        delay_hours = COALESCE(EXCLUDED.delay_hours, page_configs.delay_hours),
        scheduled_time = EXCLUDED.scheduled_time,
        messages_count = EXCLUDED.messages_count,
        is_enabled = EXCLUDED.is_enabled,
        updated_at = NOW()
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Add keyword to response config
CREATE OR REPLACE FUNCTION add_config_keyword(p_config_id UUID, p_keyword TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_normalized TEXT;
BEGIN
    v_normalized := LOWER(TRIM(p_keyword));
    
    UPDATE page_configs
    SET trigger_keywords = array_append(
        array_remove(trigger_keywords, v_normalized), -- Remove if exists first
        v_normalized
    ),
    updated_at = NOW()
    WHERE id = p_config_id AND category = 'response';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Remove keyword from response config
CREATE OR REPLACE FUNCTION remove_config_keyword(p_config_id UUID, p_keyword TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_normalized TEXT;
BEGIN
    v_normalized := LOWER(TRIM(p_keyword));
    
    UPDATE page_configs
    SET trigger_keywords = array_remove(trigger_keywords, v_normalized),
        updated_at = NOW()
    WHERE id = p_config_id AND category = 'response';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Add message to config selection
CREATE OR REPLACE FUNCTION add_config_message(p_config_id UUID, p_message_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE page_configs
    SET selected_message_ids = array_append(
        array_remove(selected_message_ids, p_message_id), -- Remove if exists first
        p_message_id
    ),
    updated_at = NOW()
    WHERE id = p_config_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Remove message from config selection
CREATE OR REPLACE FUNCTION remove_config_message(p_config_id UUID, p_message_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE page_configs
    SET selected_message_ids = array_remove(selected_message_ids, p_message_id),
        updated_at = NOW()
    WHERE id = p_config_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 5: TRIGGERS
-- =====================================================================================

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_page_configs_updated_at ON page_configs;
CREATE TRIGGER update_page_configs_updated_at
    BEFORE UPDATE ON page_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- PART 6: VIEWS
-- =====================================================================================

-- View: All configs with message details
CREATE OR REPLACE VIEW page_configs_detail AS
SELECT 
    pc.id,
    pc.page_id,
    p.name as page_name,
    pc.category,
    pc.name as config_name,
    pc.selection_mode,
    pc.fixed_message_id,
    fm.name as fixed_message_name,
    array_length(pc.selected_message_ids, 1) as selected_count,
    pc.trigger_keywords,
    pc.delay_hours,
    pc.scheduled_time,
    pc.messages_count,
    pc.is_enabled,
    pc.times_triggered,
    pc.created_at,
    pc.updated_at
FROM page_configs pc
JOIN pages p ON p.id = pc.page_id
LEFT JOIN messages fm ON fm.id = pc.fixed_message_id;

-- View: Message pool summary by category
CREATE OR REPLACE VIEW messages_summary AS
SELECT 
    category,
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE is_active) as active_messages,
    COUNT(*) FILTER (WHERE is_global) as global_messages,
    SUM(sent_count) as total_sent,
    SUM(delivered_count) as total_delivered,
    SUM(read_count) as total_read
FROM messages
GROUP BY category;

-- =====================================================================================
-- PART 7: MIGRATE DATA FROM OLD TABLES
-- =====================================================================================

-- Migrate welcome_messages to messages
INSERT INTO messages (id, name, category, title, subtitle, text_content, image_url, buttons, weight, is_active, is_global, sent_count, delivered_count, read_count, created_at, updated_at)
SELECT 
    id,
    COALESCE(title, 'Welcome Message'),
    'welcome',
    title,
    subtitle,
    text_content,
    image_url,
    buttons,
    COALESCE(weight, 1),
    COALESCE(is_enabled, true),
    COALESCE(is_global, true),
    COALESCE(sent_count, 0),
    COALESCE(delivered_count, 0),
    COALESCE(read_count, 0),
    created_at,
    updated_at
FROM welcome_messages
ON CONFLICT (id) DO NOTHING;

-- Migrate response_messages to messages
INSERT INTO messages (id, name, category, title, subtitle, text_content, image_url, buttons, weight, is_active, is_global, sent_count, delivered_count, read_count, created_at, updated_at)
SELECT 
    id,
    COALESCE(title, 'Response Message'),
    'response',
    title,
    subtitle,
    text_content,
    image_url,
    buttons,
    COALESCE(weight, 1),
    COALESCE(is_enabled, true),
    COALESCE(is_global, true),
    COALESCE(sent_count, 0),
    COALESCE(delivered_count, 0),
    COALESCE(read_count, 0),
    created_at,
    updated_at
FROM response_messages
ON CONFLICT (id) DO NOTHING;

-- Migrate sequence_messages to messages
INSERT INTO messages (id, name, category, title, subtitle, text_content, image_url, buttons, day_number, message_order, default_delay_hours, weight, is_active, is_global, sent_count, delivered_count, read_count, created_at, updated_at)
SELECT 
    id,
    COALESCE(title, 'Day ' || day || ' Message'),
    'sequence',
    title,
    subtitle,
    text_content,
    image_url,
    buttons,
    day,
    "order",
    COALESCE(delay_hours, 24),
    COALESCE(weight, 1),
    COALESCE(is_enabled, true),
    COALESCE(is_global, true),
    COALESCE(sent_count, 0),
    COALESCE(delivered_count, 0),
    COALESCE(read_count, 0),
    created_at,
    updated_at
FROM sequence_messages
ON CONFLICT (id) DO NOTHING;

-- Migrate broadcast_messages to messages
INSERT INTO messages (id, name, category, title, subtitle, text_content, image_url, buttons, weight, is_active, is_global, sent_count, delivered_count, read_count, created_at, updated_at)
SELECT 
    bm.id,
    COALESCE(bm.title, 'Broadcast Message'),
    'broadcast',
    bm.title,
    bm.subtitle,
    NULL, -- broadcast_messages may not have text_content
    bm.image_url,
    bm.buttons,
    COALESCE(bm.weight, 1),
    COALESCE(bm.is_enabled, true),
    COALESCE(bm.is_global, true),
    COALESCE(bm.sent_count, 0),
    COALESCE(bm.delivered_count, 0),
    COALESCE(bm.read_count, 0),
    bm.created_at,
    bm.updated_at
FROM broadcast_messages bm
ON CONFLICT (id) DO NOTHING;

-- Migrate standard_messages to messages
INSERT INTO messages (id, name, category, title, text_content, media_url, media_type, buttons, weight, is_active, is_global, created_at, updated_at)
SELECT 
    id,
    COALESCE(title, 'Standard Message'),
    'standard',
    title,
    content,
    media_url,
    media_type,
    buttons,
    COALESCE(weight, 1),
    COALESCE(is_active, true),
    COALESCE(is_global, true),
    created_at,
    updated_at
FROM standard_messages
ON CONFLICT (id) DO NOTHING;

-- Migrate page_welcome_config to page_configs
INSERT INTO page_configs (page_id, category, name, selection_mode, fixed_message_id, is_enabled, created_at, updated_at)
SELECT 
    page_id,
    'welcome',
    'Default Welcome',
    mode,
    fixed_message_id,
    true,
    created_at,
    updated_at
FROM page_welcome_config
ON CONFLICT (page_id, category, name) DO NOTHING;

-- Migrate page_response_config to page_configs
INSERT INTO page_configs (page_id, category, name, selection_mode, fixed_message_id, trigger_keywords, is_enabled, created_at, updated_at)
SELECT 
    page_id,
    'response',
    'Response: ' || keyword,
    mode,
    fixed_message_id,
    ARRAY[keyword],
    true,
    created_at,
    updated_at
FROM page_response_config
ON CONFLICT (page_id, category, name) DO NOTHING;

-- Migrate page_standard_config to page_configs
INSERT INTO page_configs (page_id, category, name, selection_mode, fixed_message_id, is_enabled, created_at, updated_at)
SELECT 
    page_id,
    'standard',
    'Default Standard',
    mode,
    fixed_message_id,
    true,
    created_at,
    updated_at
FROM page_standard_config
ON CONFLICT (page_id, category, name) DO NOTHING;

-- Update page_configs with selected messages from page_standard_messages
UPDATE page_configs pc
SET selected_message_ids = (
    SELECT array_agg(psm.message_id)
    FROM page_standard_messages psm
    WHERE psm.page_id = pc.page_id
)
WHERE pc.category = 'standard' 
  AND EXISTS (SELECT 1 FROM page_standard_messages WHERE page_id = pc.page_id);

-- =====================================================================================
-- PART 8: ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_configs ENABLE ROW LEVEL SECURITY;

-- Messages are global, everyone can read
CREATE POLICY "Anyone can view messages" ON messages FOR SELECT USING (true);

-- Only authenticated users can manage messages
CREATE POLICY "Authenticated users can manage messages" ON messages 
    FOR ALL USING (auth.role() = 'authenticated');

-- Page configs are per-page, use page ownership
CREATE POLICY "Users can view their page configs" ON page_configs FOR SELECT 
    USING (EXISTS (SELECT 1 FROM pages WHERE pages.id = page_configs.page_id AND pages.user_id = auth.uid()::text));

CREATE POLICY "Users can manage their page configs" ON page_configs FOR ALL 
    USING (EXISTS (SELECT 1 FROM pages WHERE pages.id = page_configs.page_id AND pages.user_id = auth.uid()::text));

-- =====================================================================================
-- PART 9: COMMENTS
-- =====================================================================================

COMMENT ON TABLE messages IS 'Global pool of messages across all categories (welcome, response, sequence, broadcast, standard)';
COMMENT ON TABLE page_configs IS 'Per-page configuration for how to use messages from the pool';

COMMENT ON COLUMN messages.category IS 'Message type: welcome, response, sequence, broadcast, standard';
COMMENT ON COLUMN messages.weight IS 'Selection weight for random mode (1-10, higher = more likely)';
COMMENT ON COLUMN messages.day_number IS 'For sequences: which day this message belongs to';
COMMENT ON COLUMN messages.message_order IS 'For sequences: order within the day';

COMMENT ON COLUMN page_configs.selected_message_ids IS 'Array of message IDs that this config uses';
COMMENT ON COLUMN page_configs.selection_mode IS 'How to pick messages: random, fixed, or ordered';
COMMENT ON COLUMN page_configs.trigger_keywords IS 'For responses: keywords that trigger this config';
COMMENT ON COLUMN page_configs.delay_hours IS 'For sequences: array of delays between messages';

COMMENT ON FUNCTION get_config_message IS 'Get a message based on config settings (respects mode)';
COMMENT ON FUNCTION get_page_welcome IS 'Get welcome message for a page';
COMMENT ON FUNCTION get_page_response IS 'Get response message for a page/keyword';
COMMENT ON FUNCTION get_page_sequence IS 'Get sequence message for a page/day/order';
COMMENT ON FUNCTION get_page_broadcast IS 'Get broadcast message for a page';
COMMENT ON FUNCTION get_page_standard IS 'Get standard message for a page';
COMMENT ON FUNCTION upsert_page_config IS 'Create or update a page configuration';

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================
