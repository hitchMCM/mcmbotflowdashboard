-- =====================================================================================
-- Migration: Page-Specific Message Configuration
-- Date: 2026-01-07
-- Description: 
--   Add per-page configuration for welcome, sequence, and broadcast messages.
--   Each page can choose between:
--   - RANDOM mode: System picks randomly from global pool (weighted)
--   - FIXED mode: Use specific assigned messages
--   
--   For sequences: Also support custom timing per page
-- =====================================================================================

-- =====================================================================================
-- PART 1: PAGE WELCOME CONFIGURATION
-- =====================================================================================

-- Table: page_welcome_config
-- Purpose: Configure how each page handles welcome messages
CREATE TABLE IF NOT EXISTS page_welcome_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('random', 'fixed')),
    fixed_message_id UUID REFERENCES welcome_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one welcome config
    UNIQUE(page_id),
    
    -- If mode is 'fixed', fixed_message_id must be set
    CONSTRAINT check_fixed_message CHECK (
        (mode = 'random' AND fixed_message_id IS NULL) OR
        (mode = 'fixed' AND fixed_message_id IS NOT NULL)
    )
);

CREATE INDEX idx_page_welcome_config_page ON page_welcome_config(page_id);

-- =====================================================================================
-- PART 2: PAGE SEQUENCE CONFIGURATION
-- =====================================================================================

-- Table: page_sequence_config
-- Purpose: Configure how each page handles sequence messages
-- Allows custom timing and message assignment per day/order
CREATE TABLE IF NOT EXISTS page_sequence_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL CHECK (day_number >= 1),
    message_order INTEGER NOT NULL CHECK (message_order >= 1),
    mode TEXT NOT NULL CHECK (mode IN ('random', 'fixed')),
    fixed_message_id UUID REFERENCES sequence_messages(id) ON DELETE SET NULL,
    
    -- Custom timing (in hours from previous message)
    custom_delay_hours INTEGER CHECK (custom_delay_hours >= 0),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one config per day/order
    UNIQUE(page_id, day_number, message_order),
    
    -- If mode is 'fixed', fixed_message_id must be set
    CONSTRAINT check_fixed_sequence_message CHECK (
        (mode = 'random' AND fixed_message_id IS NULL) OR
        (mode = 'fixed' AND fixed_message_id IS NOT NULL)
    )
);

CREATE INDEX idx_page_sequence_config_page ON page_sequence_config(page_id);
CREATE INDEX idx_page_sequence_config_day_order ON page_sequence_config(day_number, message_order);

-- =====================================================================================
-- PART 3: PAGE BROADCAST CONFIGURATION
-- =====================================================================================

-- Table: page_broadcast_config
-- Purpose: Configure which broadcasts are assigned to which pages
-- A broadcast can be assigned to multiple pages
CREATE TABLE IF NOT EXISTS page_broadcast_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    broadcast_id UUID NOT NULL REFERENCES broadcasts(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('random', 'fixed')),
    fixed_message_id UUID REFERENCES broadcast_messages(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one config per broadcast
    UNIQUE(page_id, broadcast_id),
    
    -- If mode is 'fixed', fixed_message_id must be set
    CONSTRAINT check_fixed_broadcast_message CHECK (
        (mode = 'random' AND fixed_message_id IS NULL) OR
        (mode = 'fixed' AND fixed_message_id IS NOT NULL)
    )
);

CREATE INDEX idx_page_broadcast_config_page ON page_broadcast_config(page_id);
CREATE INDEX idx_page_broadcast_config_broadcast ON page_broadcast_config(broadcast_id);

-- =====================================================================================
-- PART 4: PAGE RESPONSE CONFIGURATION
-- =====================================================================================

-- Table: page_response_config
-- Purpose: Configure how each page handles response messages
CREATE TABLE IF NOT EXISTS page_response_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('random', 'fixed')),
    fixed_message_id UUID REFERENCES response_messages(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one config per keyword
    UNIQUE(page_id, keyword),
    
    -- If mode is 'fixed', fixed_message_id must be set
    CONSTRAINT check_fixed_response_message CHECK (
        (mode = 'random' AND fixed_message_id IS NULL) OR
        (mode = 'fixed' AND fixed_message_id IS NOT NULL)
    )
);

CREATE INDEX idx_page_response_config_page ON page_response_config(page_id);
CREATE INDEX idx_page_response_config_keyword ON page_response_config(keyword);

-- =====================================================================================
-- PART 5: UPDATED SELECTION FUNCTIONS
-- =====================================================================================

-- Function: get_page_welcome_message
-- Purpose: Get welcome message for specific page (respects page config)
-- Returns: Random or fixed message based on page configuration
CREATE OR REPLACE FUNCTION get_page_welcome_message(p_page_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    buttons JSONB,
    weight INTEGER
) AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Check if page has a specific configuration
    SELECT mode, fixed_message_id
    INTO v_config
    FROM page_welcome_config
    WHERE page_id = p_page_id;
    
    -- If fixed mode, return the specific message
    IF v_config.mode = 'fixed' AND v_config.fixed_message_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            wm.id,
            wm.title,
            wm.content,
            wm.media_url,
            wm.media_type,
            wm.buttons,
            wm.weight
        FROM welcome_messages wm
        WHERE wm.id = v_config.fixed_message_id
          AND wm.is_active = true;
        RETURN;
    END IF;
    
    -- Otherwise, use random weighted selection (default behavior)
    RETURN QUERY
    SELECT 
        wm.id,
        wm.title,
        wm.content,
        wm.media_url,
        wm.media_type,
        wm.buttons,
        wm.weight
    FROM welcome_messages wm
    WHERE wm.is_active = true
      AND wm.is_global = true
    ORDER BY random() * wm.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: get_page_sequence_message
-- Purpose: Get sequence message for specific page (respects page config)
-- Returns: Random or fixed message based on page configuration
CREATE OR REPLACE FUNCTION get_page_sequence_message(
    p_page_id UUID,
    p_day_number INTEGER,
    p_message_order INTEGER
)
RETURNS TABLE (
    id UUID,
    sequence_id UUID,
    title TEXT,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    buttons JSONB,
    delay_hours INTEGER,
    weight INTEGER
) AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Check if page has a specific configuration for this day/order
    SELECT mode, fixed_message_id, custom_delay_hours
    INTO v_config
    FROM page_sequence_config
    WHERE page_id = p_page_id
      AND day_number = p_day_number
      AND message_order = p_message_order;
    
    -- If fixed mode, return the specific message
    IF v_config.mode = 'fixed' AND v_config.fixed_message_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            sm.id,
            sm.sequence_id,
            sm.title,
            sm.content,
            sm.media_url,
            sm.media_type,
            sm.buttons,
            COALESCE(v_config.custom_delay_hours, sm.delay_hours) as delay_hours,
            sm.weight
        FROM sequence_messages sm
        WHERE sm.id = v_config.fixed_message_id
          AND sm.is_active = true;
        RETURN;
    END IF;
    
    -- Otherwise, use random weighted selection (default behavior)
    RETURN QUERY
    SELECT 
        sm.id,
        sm.sequence_id,
        sm.title,
        sm.content,
        sm.media_url,
        sm.media_type,
        sm.buttons,
        sm.delay_hours,
        sm.weight
    FROM sequence_messages sm
    WHERE sm.is_active = true
      AND sm.is_global = true
      AND sm.day_number = p_day_number
      AND sm.message_order = p_message_order
    ORDER BY random() * sm.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: get_page_broadcast_message
-- Purpose: Get broadcast message for specific page (respects page config)
-- Returns: Random or fixed message based on page configuration
CREATE OR REPLACE FUNCTION get_page_broadcast_message(
    p_page_id UUID,
    p_broadcast_id UUID
)
RETURNS TABLE (
    id UUID,
    broadcast_id UUID,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    buttons JSONB,
    weight INTEGER
) AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Check if page has a specific configuration for this broadcast
    SELECT mode, fixed_message_id
    INTO v_config
    FROM page_broadcast_config
    WHERE page_id = p_page_id
      AND broadcast_id = p_broadcast_id;
    
    -- If fixed mode, return the specific message
    IF v_config.mode = 'fixed' AND v_config.fixed_message_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            bm.id,
            bm.broadcast_id,
            bm.content,
            bm.media_url,
            bm.media_type,
            bm.buttons,
            bm.weight
        FROM broadcast_messages bm
        WHERE bm.id = v_config.fixed_message_id
          AND bm.is_active = true;
        RETURN;
    END IF;
    
    -- Otherwise, use random weighted selection (default behavior)
    RETURN QUERY
    SELECT 
        bm.id,
        bm.broadcast_id,
        bm.content,
        bm.media_url,
        bm.media_type,
        bm.buttons,
        bm.weight
    FROM broadcast_messages bm
    WHERE bm.is_active = true
      AND bm.broadcast_id = p_broadcast_id
      AND EXISTS (
          SELECT 1 FROM broadcasts b
          WHERE b.id = bm.broadcast_id
            AND b.is_global = true
      )
    ORDER BY random() * bm.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function: get_page_response_message
-- Purpose: Get response message for specific page and keyword (respects page config)
-- Returns: Random or fixed message based on page configuration
CREATE OR REPLACE FUNCTION get_page_response_message(
    p_page_id UUID,
    p_keyword TEXT
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    subtitle TEXT,
    content TEXT,
    media_url TEXT,
    media_type TEXT,
    buttons JSONB,
    weight INTEGER
) AS $$
DECLARE
    v_config RECORD;
BEGIN
    -- Check if page has a specific configuration for this keyword
    SELECT mode, fixed_message_id
    INTO v_config
    FROM page_response_config
    WHERE page_id = p_page_id
      AND keyword = p_keyword;
    
    -- If fixed mode, return the specific message
    IF v_config.mode = 'fixed' AND v_config.fixed_message_id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            rm.id,
            rm.title,
            rm.subtitle,
            rm.content,
            rm.media_url,
            rm.media_type,
            rm.buttons,
            rm.weight
        FROM response_messages rm
        WHERE rm.id = v_config.fixed_message_id
          AND rm.is_active = true;
        RETURN;
    END IF;
    
    -- Otherwise, use random weighted selection (default behavior)
    RETURN QUERY
    SELECT 
        rm.id,
        rm.title,
        rm.subtitle,
        rm.content,
        rm.media_url,
        rm.media_type,
        rm.buttons,
        rm.weight
    FROM response_messages rm
    WHERE rm.is_active = true
      AND rm.is_global = true
      AND rm.keyword = p_keyword
    ORDER BY random() * rm.weight DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PART 6: TRIGGERS
-- =====================================================================================

CREATE TRIGGER update_page_welcome_config_updated_at
    BEFORE UPDATE ON page_welcome_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_sequence_config_updated_at
    BEFORE UPDATE ON page_sequence_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_broadcast_config_updated_at
    BEFORE UPDATE ON page_broadcast_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_page_response_config_updated_at
    BEFORE UPDATE ON page_response_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- PART 7: VIEWS FOR CONFIGURATION MANAGEMENT
-- =====================================================================================

-- View: page_welcome_config_detail
-- Purpose: Show welcome configuration with message details
CREATE OR REPLACE VIEW page_welcome_config_detail AS
SELECT 
    pwc.id,
    pwc.page_id,
    p.name as page_name,
    pwc.mode,
    pwc.fixed_message_id,
    wm.title as fixed_message_title,
    pwc.created_at,
    pwc.updated_at
FROM page_welcome_config pwc
JOIN pages p ON p.id = pwc.page_id
LEFT JOIN welcome_messages wm ON wm.id = pwc.fixed_message_id;

-- View: page_sequence_config_detail
-- Purpose: Show sequence configuration with message details
CREATE OR REPLACE VIEW page_sequence_config_detail AS
SELECT 
    psc.id,
    psc.page_id,
    p.name as page_name,
    psc.day_number,
    psc.message_order,
    psc.mode,
    psc.fixed_message_id,
    sm.title as fixed_message_title,
    psc.custom_delay_hours,
    sm.delay_hours as default_delay_hours,
    psc.created_at,
    psc.updated_at
FROM page_sequence_config psc
JOIN pages p ON p.id = psc.page_id
LEFT JOIN sequence_messages sm ON sm.id = psc.fixed_message_id;

-- View: page_broadcast_config_detail
-- Purpose: Show broadcast configuration with message details
CREATE OR REPLACE VIEW page_broadcast_config_detail AS
SELECT 
    pbc.id,
    pbc.page_id,
    p.name as page_name,
    pbc.broadcast_id,
    b.name as broadcast_name,
    pbc.mode,
    pbc.fixed_message_id,
    bm.content as fixed_message_content,
    pbc.created_at,
    pbc.updated_at
FROM page_broadcast_config pbc
JOIN pages p ON p.id = pbc.page_id
JOIN broadcasts b ON b.id = pbc.broadcast_id
LEFT JOIN broadcast_messages bm ON bm.id = pbc.fixed_message_id;

-- View: page_response_config_detail
-- Purpose: Show response configuration with message details
CREATE OR REPLACE VIEW page_response_config_detail AS
SELECT 
    prc.id,
    prc.page_id,
    p.name as page_name,
    prc.keyword,
    prc.mode,
    prc.fixed_message_id,
    rm.title as fixed_message_title,
    prc.created_at,
    prc.updated_at
FROM page_response_config prc
JOIN pages p ON p.id = prc.page_id
LEFT JOIN response_messages rm ON rm.id = prc.fixed_message_id;

-- =====================================================================================
-- PART 8: HELPER FUNCTIONS
-- =====================================================================================

-- Function: set_page_welcome_mode
-- Purpose: Configure welcome message mode for a page
-- Usage: SELECT set_page_welcome_mode('page-uuid', 'random', NULL);
--        SELECT set_page_welcome_mode('page-uuid', 'fixed', 'message-uuid');
CREATE OR REPLACE FUNCTION set_page_welcome_mode(
    p_page_id UUID,
    p_mode TEXT,
    p_fixed_message_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Validate mode
    IF p_mode NOT IN ('random', 'fixed') THEN
        RAISE EXCEPTION 'Invalid mode: %. Must be ''random'' or ''fixed''', p_mode;
    END IF;
    
    -- Validate fixed message if mode is fixed
    IF p_mode = 'fixed' AND p_fixed_message_id IS NULL THEN
        RAISE EXCEPTION 'fixed_message_id is required when mode is ''fixed''';
    END IF;
    
    -- Insert or update configuration
    INSERT INTO page_welcome_config (page_id, mode, fixed_message_id)
    VALUES (p_page_id, p_mode, p_fixed_message_id)
    ON CONFLICT (page_id) 
    DO UPDATE SET 
        mode = EXCLUDED.mode,
        fixed_message_id = EXCLUDED.fixed_message_id,
        updated_at = NOW()
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- Function: set_page_sequence_mode
-- Purpose: Configure sequence message mode for a page
CREATE OR REPLACE FUNCTION set_page_sequence_mode(
    p_page_id UUID,
    p_day_number INTEGER,
    p_message_order INTEGER,
    p_mode TEXT,
    p_fixed_message_id UUID DEFAULT NULL,
    p_custom_delay_hours INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Validate mode
    IF p_mode NOT IN ('random', 'fixed') THEN
        RAISE EXCEPTION 'Invalid mode: %. Must be ''random'' or ''fixed''', p_mode;
    END IF;
    
    -- Validate fixed message if mode is fixed
    IF p_mode = 'fixed' AND p_fixed_message_id IS NULL THEN
        RAISE EXCEPTION 'fixed_message_id is required when mode is ''fixed''';
    END IF;
    
    -- Insert or update configuration
    INSERT INTO page_sequence_config 
        (page_id, day_number, message_order, mode, fixed_message_id, custom_delay_hours)
    VALUES 
        (p_page_id, p_day_number, p_message_order, p_mode, p_fixed_message_id, p_custom_delay_hours)
    ON CONFLICT (page_id, day_number, message_order) 
    DO UPDATE SET 
        mode = EXCLUDED.mode,
        fixed_message_id = EXCLUDED.fixed_message_id,
        custom_delay_hours = EXCLUDED.custom_delay_hours,
        updated_at = NOW()
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- Function: set_page_broadcast_mode
-- Purpose: Configure broadcast message mode for a page
CREATE OR REPLACE FUNCTION set_page_broadcast_mode(
    p_page_id UUID,
    p_broadcast_id UUID,
    p_mode TEXT,
    p_fixed_message_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Validate mode
    IF p_mode NOT IN ('random', 'fixed') THEN
        RAISE EXCEPTION 'Invalid mode: %. Must be ''random'' or ''fixed''', p_mode;
    END IF;
    
    -- Validate fixed message if mode is fixed
    IF p_mode = 'fixed' AND p_fixed_message_id IS NULL THEN
        RAISE EXCEPTION 'fixed_message_id is required when mode is ''fixed''';
    END IF;
    
    -- Insert or update configuration
    INSERT INTO page_broadcast_config (page_id, broadcast_id, mode, fixed_message_id)
    VALUES (p_page_id, p_broadcast_id, p_mode, p_fixed_message_id)
    ON CONFLICT (page_id, broadcast_id) 
    DO UPDATE SET 
        mode = EXCLUDED.mode,
        fixed_message_id = EXCLUDED.fixed_message_id,
        updated_at = NOW()
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- Function: set_page_response_mode
-- Purpose: Configure response message mode for a page
CREATE OR REPLACE FUNCTION set_page_response_mode(
    p_page_id UUID,
    p_keyword TEXT,
    p_mode TEXT,
    p_fixed_message_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
BEGIN
    -- Validate mode
    IF p_mode NOT IN ('random', 'fixed') THEN
        RAISE EXCEPTION 'Invalid mode: %. Must be ''random'' or ''fixed''', p_mode;
    END IF;
    
    -- Validate fixed message if mode is fixed
    IF p_mode = 'fixed' AND p_fixed_message_id IS NULL THEN
        RAISE EXCEPTION 'fixed_message_id is required when mode is ''fixed''';
    END IF;
    
    -- Insert or update configuration
    INSERT INTO page_response_config (page_id, keyword, mode, fixed_message_id)
    VALUES (p_page_id, p_keyword, p_mode, p_fixed_message_id)
    ON CONFLICT (page_id, keyword) 
    DO UPDATE SET 
        mode = EXCLUDED.mode,
        fixed_message_id = EXCLUDED.fixed_message_id,
        updated_at = NOW()
    RETURNING id INTO v_config_id;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- END OF MIGRATION
-- =====================================================================================

COMMENT ON TABLE page_welcome_config IS 'Per-page welcome message configuration (random vs fixed)';
COMMENT ON TABLE page_sequence_config IS 'Per-page sequence message configuration (random vs fixed + custom timing)';
COMMENT ON TABLE page_broadcast_config IS 'Per-page broadcast message configuration (random vs fixed)';
COMMENT ON TABLE page_response_config IS 'Per-page response message configuration (random vs fixed)';

COMMENT ON FUNCTION get_page_welcome_message IS 'Get welcome message for page (respects config)';
COMMENT ON FUNCTION get_page_sequence_message IS 'Get sequence message for page (respects config)';
COMMENT ON FUNCTION get_page_broadcast_message IS 'Get broadcast message for page (respects config)';
COMMENT ON FUNCTION get_page_response_message IS 'Get response message for page (respects config)';

COMMENT ON FUNCTION set_page_welcome_mode IS 'Configure welcome mode for page (random/fixed)';
COMMENT ON FUNCTION set_page_sequence_mode IS 'Configure sequence mode for page (random/fixed + timing)';
COMMENT ON FUNCTION set_page_broadcast_mode IS 'Configure broadcast mode for page (random/fixed)';
COMMENT ON FUNCTION set_page_response_mode IS 'Configure response mode for page (random/fixed)';
