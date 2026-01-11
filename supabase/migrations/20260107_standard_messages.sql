-- =====================================================================================
-- Migration: Standard Messages
-- Date: 2026-01-07
-- Description: Add standard messages - general purpose messages that can be sent anytime
-- =====================================================================================

-- Table: standard_messages
-- Purpose: Store standard/general purpose messages (global pool)
CREATE TABLE IF NOT EXISTS standard_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_url TEXT,
    media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
    buttons JSONB,
    message_type TEXT DEFAULT 'template' CHECK (message_type IN ('text', 'template')),
    weight INTEGER DEFAULT 1 CHECK (weight >= 1 AND weight <= 10),
    is_active BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_standard_messages_active ON standard_messages(is_active);
CREATE INDEX idx_standard_messages_global ON standard_messages(is_global);

-- Table: page_standard_config
-- Purpose: Configure how each page handles standard messages
CREATE TABLE IF NOT EXISTS page_standard_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    mode TEXT NOT NULL CHECK (mode IN ('random', 'fixed')),
    fixed_message_id UUID REFERENCES standard_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one standard config
    UNIQUE(page_id),
    
    -- If mode is 'fixed', fixed_message_id must be set
    CONSTRAINT check_fixed_standard_message CHECK (
        (mode = 'random' AND fixed_message_id IS NULL) OR
        (mode = 'fixed' AND fixed_message_id IS NOT NULL)
    )
);

CREATE INDEX idx_page_standard_config_page ON page_standard_config(page_id);

-- Table: page_standard_messages
-- Purpose: Link selected messages to pages (for random mode)
CREATE TABLE IF NOT EXISTS page_standard_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES standard_messages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each page can only have one link per message
    UNIQUE(page_id, message_id)
);

CREATE INDEX idx_page_standard_messages_page ON page_standard_messages(page_id);
CREATE INDEX idx_page_standard_messages_message ON page_standard_messages(message_id);

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

-- Function: get_page_standard_message
-- Purpose: Get standard message for specific page (respects page config)
CREATE OR REPLACE FUNCTION get_page_standard_message(p_page_id UUID)
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
    -- Get page configuration
    SELECT * INTO v_config
    FROM page_standard_config
    WHERE page_id = p_page_id;
    
    -- If no config, return random from global pool
    IF v_config IS NULL THEN
        RETURN QUERY
        SELECT sm.id, sm.title, sm.content, sm.media_url, sm.media_type, sm.buttons, sm.weight
        FROM standard_messages sm
        WHERE sm.is_active = true AND sm.is_global = true
        ORDER BY RANDOM()
        LIMIT 1;
        RETURN;
    END IF;
    
    -- FIXED mode: Return the specific message
    IF v_config.mode = 'fixed' THEN
        RETURN QUERY
        SELECT sm.id, sm.title, sm.content, sm.media_url, sm.media_type, sm.buttons, sm.weight
        FROM standard_messages sm
        WHERE sm.id = v_config.fixed_message_id AND sm.is_active = true;
        RETURN;
    END IF;
    
    -- RANDOM mode: Return random from selected messages
    IF v_config.mode = 'random' THEN
        RETURN QUERY
        SELECT sm.id, sm.title, sm.content, sm.media_url, sm.media_type, sm.buttons, sm.weight
        FROM standard_messages sm
        INNER JOIN page_standard_messages psm ON sm.id = psm.message_id
        WHERE psm.page_id = p_page_id AND sm.is_active = true
        ORDER BY RANDOM()
        LIMIT 1;
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: set_page_standard_mode
-- Purpose: Configure standard message mode for a page
CREATE OR REPLACE FUNCTION set_page_standard_mode(
    p_page_id UUID,
    p_mode TEXT,
    p_fixed_message_id UUID DEFAULT NULL,
    p_message_ids UUID[] DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_config_id UUID;
    v_message_id UUID;
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
    INSERT INTO page_standard_config (page_id, mode, fixed_message_id)
    VALUES (p_page_id, p_mode, p_fixed_message_id)
    ON CONFLICT (page_id) 
    DO UPDATE SET 
        mode = EXCLUDED.mode,
        fixed_message_id = EXCLUDED.fixed_message_id,
        updated_at = NOW()
    RETURNING id INTO v_config_id;
    
    -- If random mode and message_ids provided, update selected messages
    IF p_mode = 'random' AND p_message_ids IS NOT NULL THEN
        -- Clear existing selections
        DELETE FROM page_standard_messages WHERE page_id = p_page_id;
        
        -- Insert new selections
        FOREACH v_message_id IN ARRAY p_message_ids
        LOOP
            INSERT INTO page_standard_messages (page_id, message_id)
            VALUES (p_page_id, v_message_id)
            ON CONFLICT (page_id, message_id) DO NOTHING;
        END LOOP;
    END IF;
    
    RETURN v_config_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- VIEWS
-- =====================================================================================

-- View: page_standard_config_detail
-- Purpose: Detailed view of page standard configuration
CREATE OR REPLACE VIEW page_standard_config_detail AS
SELECT 
    psc.id,
    psc.page_id,
    p.name as page_name,
    psc.mode,
    psc.fixed_message_id,
    sm.title as fixed_message_title,
    sm.content as fixed_message_content,
    (
        SELECT json_agg(json_build_object(
            'id', psm_inner.message_id,
            'title', sm_inner.title,
            'content', sm_inner.content
        ))
        FROM page_standard_messages psm_inner
        INNER JOIN standard_messages sm_inner ON psm_inner.message_id = sm_inner.id
        WHERE psm_inner.page_id = psc.page_id
    ) as selected_messages,
    psc.created_at,
    psc.updated_at
FROM page_standard_config psc
INNER JOIN pages p ON psc.page_id = p.id
LEFT JOIN standard_messages sm ON psc.fixed_message_id = sm.id;

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE standard_messages IS 'General purpose messages (global pool)';
COMMENT ON TABLE page_standard_config IS 'Per-page standard message configuration';
COMMENT ON TABLE page_standard_messages IS 'Selected standard messages per page (for random mode)';

COMMENT ON FUNCTION get_page_standard_message IS 'Get standard message for page (respects config)';
COMMENT ON FUNCTION set_page_standard_mode IS 'Configure standard mode for page (random/fixed + message selection)';

COMMENT ON VIEW page_standard_config_detail IS 'Detailed view of page standard message configuration';
